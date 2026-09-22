"""Client and parser tests.

Several of these guard behaviour that fails SILENTLY if it regresses — a
pinned `Accept-Encoding` still works, a conditional header is simply ignored,
a broken digest just means every poll re-parses. None of them would show up as
a red test unless a test asserts them directly.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import aiohttp
import pytest

from custom_components.badegewaesser_austria.api import (
    BadegewaesserApiError,
    BadegewaesserClient,
    base_request_headers,
    content_digest,
    parse_document,
)
from custom_components.badegewaesser_austria.const import API_URL, USER_AGENT

FIXTURE = Path(__file__).parent / "fixtures" / "badegewaesser_db.json"

NORMAL = "AT1051051100150010"
CLOSED = "AT9999999999999001"
UNRATED = "AT9999999999999002"
NEVER_SAMPLED = "AT9999999999999003"
NULL_ISLAND = "AT3230004400240040"
ZERO_TEMPERATURE = "AT1300002200020010"


def fixture_bytes() -> bytes:
    """The recorded document, as it arrives off the wire."""
    return FIXTURE.read_bytes()


def make_response_cm(resp: Any) -> MagicMock:
    """Wrap a mock response as an async context manager.

    Production code uses `async with session.get(...) as resp:`, so the return
    value of `session.get` must support `__aenter__` / `__aexit__`. Real
    aiohttp's `_RequestContextManager` is both awaitable and a context
    manager; a mock only needs the context-manager half.
    """
    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=resp)
    cm.__aexit__ = AsyncMock(return_value=None)
    return cm


def make_session(*bodies: bytes, status: int = 200) -> MagicMock:
    """A session whose successive GETs return each body in turn."""
    responses = []
    for body in bodies:
        resp = MagicMock()
        resp.status = status
        resp.read = AsyncMock(return_value=body)
        responses.append(make_response_cm(resp))
    session = MagicMock()
    session.get = MagicMock(side_effect=responses)
    return session


# --- headers ---------------------------------------------------------------


def test_user_agent_is_sent() -> None:
    """Every outbound call identifies the integration."""
    assert base_request_headers()["User-Agent"] == USER_AGENT
    assert "badegewaesser_austria/" in USER_AGENT
    assert "github.com/rolandzeiner/badegewaesser-austria" in USER_AGENT


def test_accept_encoding_is_not_pinned() -> None:
    """`Accept-Encoding` must stay ABSENT so aiohttp negotiates it.

    Setting it here REPLACES aiohttp's own offer rather than extending it, so
    the well-meant `{"Accept-Encoding": "gzip"}` is a downgrade from the
    `gzip, deflate, zstd` aiohttp sends by default on Python 3.14. Several
    repos in this portfolio carry exactly that bug. Asserting the ABSENCE is
    the only way a future "optimisation" trips CI.
    """
    assert "Accept-Encoding" not in base_request_headers()
    assert "accept-encoding" not in {k.lower() for k in base_request_headers()}


async def test_no_conditional_validator_is_ever_sent() -> None:
    """No `If-Modified-Since` / `If-None-Match`, on the first poll or any later one.

    The probe script reports `Conditional GET: WORKS` for this endpoint. It is
    wrong — the file is regenerated every ~10 minutes regardless of content,
    so `Last-Modified` churns faster than any sane poll and a 304 can never
    fire. See the measured block in const.py. This test exists so nobody
    re-adds the validator because the probe told them to.
    """
    body = fixture_bytes()
    session = make_session(body, body, body)
    client = BadegewaesserClient(session)

    for _ in range(3):
        await client.async_fetch()

    assert session.get.call_count == 3
    for call in session.get.call_args_list:
        headers = call.kwargs["headers"]
        assert "If-Modified-Since" not in headers
        assert "If-None-Match" not in headers
        assert call.args[0] == API_URL


# --- digest short-circuit --------------------------------------------------


def test_digest_ignores_the_regeneration_counter() -> None:
    """A VERSION-only change must NOT look like a content change.

    `VERSION` is a regeneration counter that increments every ~10 minutes over
    a byte-identical payload, and it is serialised as a STRING. A strip
    pattern written for an int silently matches nothing, and then every single
    poll looks like a change — which is precisely the cost the digest exists
    to avoid.
    """
    raw = fixture_bytes()
    bumped = raw.replace(b'"VERSION": "121625"', b'"VERSION": "999999"', 1)
    assert bumped != raw, "fixture no longer carries the expected VERSION literal"
    assert content_digest(raw) == content_digest(bumped)


def test_digest_still_sees_a_real_content_change() -> None:
    """Stripping VERSION must not blind the digest to everything else."""
    raw = fixture_bytes()
    changed = raw.replace(b"Naturbadesee", b"Naturbadeteich", 1)
    assert changed != raw
    assert content_digest(raw) != content_digest(changed)


async def test_unchanged_document_short_circuits_before_parsing() -> None:
    """The second fetch of an unchanged document returns None and skips the parse.

    The saving is the parse of a 312 KB document plus the downstream state
    churn — not bytes. The 24 KB arrives either way.
    """
    body = fixture_bytes()
    client = BadegewaesserClient(make_session(body, body))

    first = await client.async_fetch()
    assert first is not None

    with patch("custom_components.badegewaesser_austria.api.json_loads") as spy_parse:
        second = await client.async_fetch()

    assert second is None, "unchanged document should short-circuit"
    # The point of the digest: no parse at all, not merely a cheaper one.
    spy_parse.assert_not_called()


async def test_version_only_change_short_circuits() -> None:
    """The real steady state: upstream regenerates, content is identical."""
    raw = fixture_bytes()
    bumped = raw.replace(b'"VERSION": "121625"', b'"VERSION": "121626"', 1)
    client = BadegewaesserClient(make_session(raw, bumped))

    assert await client.async_fetch() is not None
    assert await client.async_fetch() is None


async def test_changed_document_is_reparsed() -> None:
    """A genuine change must not be swallowed by the digest."""
    raw = fixture_bytes()
    changed = raw.replace(b"Naturbadesee K\\u00f6nigsdorf", b"Umbenannter See", 1)
    if changed == raw:  # fixture written with real UTF-8 rather than escapes
        changed = raw.replace("Naturbadesee Königsdorf".encode(), b"Umbenannter See", 1)
    assert changed != raw

    client = BadegewaesserClient(make_session(raw, changed))
    await client.async_fetch()
    second = await client.async_fetch()

    assert second is not None
    assert second[NORMAL].name == "Umbenannter See"


async def test_reset_cache_forces_a_reparse() -> None:
    """Clearing the digest makes the next identical fetch parse again."""
    body = fixture_bytes()
    client = BadegewaesserClient(make_session(body, body))

    await client.async_fetch()
    client.reset_cache()

    assert await client.async_fetch() is not None


# --- transport errors ------------------------------------------------------


async def test_non_200_raises_invalid_response() -> None:
    """A 503 is an upstream problem, reported as one."""
    client = BadegewaesserClient(make_session(b"", status=503))
    with pytest.raises(BadegewaesserApiError) as err:
        await client.async_fetch()
    assert err.value.translation_key == "invalid_response"
    assert "503" in err.value.detail


async def test_client_error_raises_cannot_connect() -> None:
    """A transport failure is reported as unreachable, not as bad data."""
    session = MagicMock()
    session.get = MagicMock(side_effect=aiohttp.ClientError("boom"))
    with pytest.raises(BadegewaesserApiError) as err:
        await BadegewaesserClient(session).async_fetch()
    assert err.value.translation_key == "cannot_connect"


async def test_timeout_raises_cannot_connect() -> None:
    """A timeout is reported as unreachable."""
    session = MagicMock()
    session.get = MagicMock(side_effect=TimeoutError)
    with pytest.raises(BadegewaesserApiError) as err:
        await BadegewaesserClient(session).async_fetch()
    assert err.value.translation_key == "cannot_connect"


async def test_unparseable_body_raises_malformed_payload() -> None:
    """Bytes that are not JSON at all."""
    client = BadegewaesserClient(make_session(b"<html>maintenance</html>"))
    with pytest.raises(BadegewaesserApiError) as err:
        await client.async_fetch()
    assert err.value.translation_key == "malformed_payload"


async def test_failed_fetch_does_not_poison_the_digest() -> None:
    """A failure must leave the cache untouched so the retry re-parses."""
    body = fixture_bytes()
    client = BadegewaesserClient(make_session(body))
    await client.async_fetch()
    good_digest = client.digest

    client._session = make_session(b"not json")
    with pytest.raises(BadegewaesserApiError):
        await client.async_fetch()

    assert client.digest == good_digest


# --- document shape --------------------------------------------------------


@pytest.mark.parametrize(
    "payload",
    [
        [],
        "nope",
        {"BUNDESLAENDER": "not a list"},
        {},
    ],
)
def test_unusable_documents_raise(payload: Any) -> None:
    """A document with no recognisable shape is an error, not an empty result."""
    with pytest.raises(BadegewaesserApiError) as err:
        parse_document(payload)
    assert err.value.translation_key == "malformed_payload"


def test_one_bad_site_does_not_lose_the_others() -> None:
    """A single malformed row in a 260-row third-party feed is skipped, not fatal."""
    payload = json.loads(fixture_bytes())
    payload["BUNDESLAENDER"][0]["BADEGEWAESSER"].insert(0, {"BADEGEWAESSERNAME": ""})
    payload["BUNDESLAENDER"][0]["BADEGEWAESSER"].insert(0, "not even an object")

    sites = parse_document(payload)
    assert NORMAL in sites
