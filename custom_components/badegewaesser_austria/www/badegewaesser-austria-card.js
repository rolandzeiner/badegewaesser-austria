/*! Badegewässer Austria — bundled by Rolldown. Edit sources in src/, then `npm run build`. */
var e=Object.defineProperty,t=(e,t,n)=>()=>{if(n)throw n[0];try{return e&&(t=e(e=0)),t}catch(e){throw n=[e],e}},n=(t,n)=>{let r={};for(var i in t)e(r,i,{get:t[i],enumerable:!0});return n||e(r,Symbol.toStringTag,{value:`Module`}),r},r,i,a,o,s,c,l,u,d,f=t((()=>{
/**
* @license
* Copyright 2019 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
r=globalThis,i=r.ShadowRoot&&(r.ShadyCSS===void 0||r.ShadyCSS.nativeShadow)&&`adoptedStyleSheets`in Document.prototype&&`replace`in CSSStyleSheet.prototype,a=Symbol(),o=/* @__PURE__ */ new WeakMap,s=class{constructor(e,t,n){if(this._$cssResult$=!0,n!==a)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o,t=this.t;if(i&&e===void 0){let n=t!==void 0&&t.length===1;n&&(e=o.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),n&&o.set(t,e))}return e}toString(){return this.cssText}},c=e=>new s(typeof e==`string`?e:e+``,void 0,a),l=(e,...t)=>{let n=e.length===1?e[0]:t.reduce((t,n,r)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if(typeof e==`number`)return e;throw Error(`Value passed to 'css' function must be a 'css' function result: `+e+`. Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.`)})(n)+e[r+1],e[0]);return new s(n,e,a)},u=(e,t)=>{if(i)e.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let n of t){let t=document.createElement(`style`),i=r.litNonce;i!==void 0&&t.setAttribute(`nonce`,i),t.textContent=n.cssText,e.appendChild(t)}},d=i?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t=``;for(let n of e.cssRules)t+=n.cssText;return c(t)})(e):e})),p,ee,te,ne,re,ie,m,ae,oe,se,h,g,_,ce,v,le=t((()=>{
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
f(),{is:p,defineProperty:ee,getOwnPropertyDescriptor:te,getOwnPropertyNames:ne,getOwnPropertySymbols:re,getPrototypeOf:ie}=Object,m=globalThis,ae=m.trustedTypes,oe=ae?ae.emptyScript:``,se=m.reactiveElementPolyfillSupport,h=(e,t)=>e,g={toAttribute(e,t){switch(t){case Boolean:e=e?oe:null;break;case Object:case Array:e=e==null?e:JSON.stringify(e)}return e},fromAttribute(e,t){let n=e;switch(t){case Boolean:n=e!==null;break;case Number:n=e===null?null:Number(e);break;case Object:case Array:try{n=JSON.parse(e)}catch{n=null}}return n}},_=(e,t)=>!p(e,t),ce={attribute:!0,type:String,converter:g,reflect:!1,useDefault:!1,hasChanged:_},Symbol.metadata??=Symbol(`metadata`),m.litPropertyMetadata??=/* @__PURE__ */ new WeakMap,v=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=ce){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){let n=Symbol(),r=this.getPropertyDescriptor(e,n,t);r!==void 0&&ee(this.prototype,e,r)}}static getPropertyDescriptor(e,t,n){let{get:r,set:i}=te(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:r,set(t){let a=r?.call(this);i?.call(this,t),this.requestUpdate(e,a,n)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??ce}static _$Ei(){if(this.hasOwnProperty(h(`elementProperties`)))return;let e=ie(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(h(`finalized`)))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(h(`properties`))){let e=this.properties,t=[...ne(e),...re(e)];for(let n of t)this.createProperty(n,e[n])}let e=this[Symbol.metadata];if(e!==null){let t=litPropertyMetadata.get(e);if(t!==void 0)for(let[e,n]of t)this.elementProperties.set(e,n)}this._$Eh=/* @__PURE__ */ new Map;for(let[e,t]of this.elementProperties){let n=this._$Eu(e,t);n!==void 0&&this._$Eh.set(n,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){let t=[];if(Array.isArray(e)){let n=new Set(e.flat(1/0).reverse());for(let e of n)t.unshift(d(e))}else e!==void 0&&t.push(d(e));return t}static _$Eu(e,t){let n=t.attribute;return!1===n?void 0:typeof n==`string`?n:typeof e==`string`?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=/* @__PURE__ */ new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=/* @__PURE__ */ new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){let e=/* @__PURE__ */ new Map,t=this.constructor.elementProperties;for(let n of t.keys())this.hasOwnProperty(n)&&(e.set(n,this[n]),delete this[n]);e.size>0&&(this._$Ep=e)}createRenderRoot(){let e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return u(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,n){this._$AK(e,n)}_$ET(e,t){let n=this.constructor.elementProperties.get(e),r=this.constructor._$Eu(e,n);if(r!==void 0&&!0===n.reflect){let i=(n.converter?.toAttribute===void 0?g:n.converter).toAttribute(t,n.type);this._$Em=e,i==null?this.removeAttribute(r):this.setAttribute(r,i),this._$Em=null}}_$AK(e,t){let n=this.constructor,r=n._$Eh.get(e);if(r!==void 0&&this._$Em!==r){let e=n.getPropertyOptions(r),i=typeof e.converter==`function`?{fromAttribute:e.converter}:e.converter?.fromAttribute===void 0?g:e.converter;this._$Em=r;let a=i.fromAttribute(t,e.type);this[r]=a??this._$Ej?.get(r)??a,this._$Em=null}}requestUpdate(e,t,n,r=!1,i){if(e!==void 0){let a=this.constructor;if(!1===r&&(i=this[e]),n??=a.getPropertyOptions(e),!((n.hasChanged??_)(i,t)||n.useDefault&&n.reflect&&i===this._$Ej?.get(e)&&!this.hasAttribute(a._$Eu(e,n))))return;this.C(e,t,n)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:n,reflect:r,wrapped:i},a){n&&!(this._$Ej??=/* @__PURE__ */ new Map).has(e)&&(this._$Ej.set(e,a??t??this[e]),!0!==i||a!==void 0)||(this._$AL.has(e)||(this.hasUpdated||n||(t=void 0),this._$AL.set(e,t)),!0===r&&this._$Em!==e&&(this._$Eq??=/* @__PURE__ */ new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}let e=this.constructor.elementProperties;if(e.size>0)for(let[t,n]of e){let{wrapped:e}=n,r=this[t];!0!==e||this._$AL.has(t)||r===void 0||this.C(t,void 0,n,r)}}let e=!1,t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=/* @__PURE__ */ new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}},v.elementStyles=[],v.shadowRootOptions={mode:`open`},v[h(`elementProperties`)]=/* @__PURE__ */ new Map,v[h(`finalized`)]=/* @__PURE__ */ new Map,se?.({ReactiveElement:v}),(m.reactiveElementVersions??=[]).push(`2.1.2`)}));
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
function ue(e,t){if(!E(e)||!e.hasOwnProperty(`raw`))throw Error(`invalid template strings array`);return fe===void 0?t:fe.createHTML(t)}function y(e,t,n=e,r){if(t===N)return t;let i=r===void 0?n._$Cl:n._$Co?.[r],a=T(t)?void 0:t._$litDirective$;return i?.constructor!==a&&(i?._$AO?.(!1),a===void 0?i=void 0:(i=new a(e),i._$AT(e,n,r)),r===void 0?n._$Cl=i:(n._$Co??=[])[r]=i),i!==void 0&&(t=y(e,i._$AS(e,t.values),i,r)),t}var b,de,x,fe,pe,S,me,he,C,w,T,E,ge,D,O,_e,ve,k,ye,be,xe,A,j,M,N,P,Se,F,Ce,I,we,L,R,Te,Ee,De,Oe,ke,Ae,je=t((()=>{b=globalThis,de=e=>e,x=b.trustedTypes,fe=x?x.createPolicy(`lit-html`,{createHTML:e=>e}):void 0,pe=`$lit$`,S=`lit$${Math.random().toFixed(9).slice(2)}$`,me=`?`+S,he=`<${me}>`,C=document,w=()=>C.createComment(``),T=e=>e===null||typeof e!=`object`&&typeof e!=`function`,E=Array.isArray,ge=e=>E(e)||typeof e?.[Symbol.iterator]==`function`,D=`[ 	
\f\r]`,O=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,_e=/-->/g,ve=/>/g,k=RegExp(`>|${D}(?:([^\\s"'>=/]+)(${D}*=${D}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,`g`),ye=/'/g,be=/"/g,xe=/^(?:script|style|textarea|title)$/i,A=e=>(t,...n)=>({_$litType$:e,strings:t,values:n}),j=A(1),M=A(2),A(3),N=Symbol.for(`lit-noChange`),P=Symbol.for(`lit-nothing`),Se=/* @__PURE__ */ new WeakMap,F=C.createTreeWalker(C,129),Ce=(e,t)=>{let n=e.length-1,r=[],i,a=t===2?`<svg>`:t===3?`<math>`:``,o=O;for(let t=0;t<n;t++){let n=e[t],s,c,l=-1,u=0;for(;u<n.length&&(o.lastIndex=u,c=o.exec(n),c!==null);)u=o.lastIndex,o===O?c[1]===`!--`?o=_e:c[1]===void 0?c[2]===void 0?c[3]!==void 0&&(o=k):(xe.test(c[2])&&(i=RegExp(`</`+c[2],`g`)),o=k):o=ve:o===k?c[0]===`>`?(o=i??O,l=-1):c[1]===void 0?l=-2:(l=o.lastIndex-c[2].length,s=c[1],o=c[3]===void 0?k:c[3]===`"`?be:ye):o===be||o===ye?o=k:o===_e||o===ve?o=O:(o=k,i=void 0);let d=o===k&&e[t+1].startsWith(`/>`)?` `:``;a+=o===O?n+he:l>=0?(r.push(s),n.slice(0,l)+pe+n.slice(l)+S+d):n+S+(l===-2?t:d)}return[ue(e,a+(e[n]||`<?>`)+(t===2?`</svg>`:t===3?`</math>`:``)),r]},I=class e{constructor({strings:t,_$litType$:n},r){let i;this.parts=[];let a=0,o=0,s=t.length-1,c=this.parts,[l,u]=Ce(t,n);if(this.el=e.createElement(l,r),F.currentNode=this.el.content,n===2||n===3){let e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;(i=F.nextNode())!==null&&c.length<s;){if(i.nodeType===1){if(i.hasAttributes())for(let e of i.getAttributeNames())if(e.endsWith(pe)){let t=u[o++],n=i.getAttribute(e).split(S),r=/([.?@])?(.*)/.exec(t);c.push({type:1,index:a,name:r[2],strings:n,ctor:r[1]===`.`?Te:r[1]===`?`?Ee:r[1]===`@`?De:R}),i.removeAttribute(e)}else e.startsWith(S)&&(c.push({type:6,index:a}),i.removeAttribute(e));if(xe.test(i.tagName)){let e=i.textContent.split(S),t=e.length-1;if(t>0){i.textContent=x?x.emptyScript:``;for(let n=0;n<t;n++)i.append(e[n],w()),F.nextNode(),c.push({type:2,index:++a});i.append(e[t],w())}}}else if(i.nodeType===8){if(i.data===me)c.push({type:2,index:a});else{let e=-1;for(;(e=i.data.indexOf(S,e+1))!==-1;)c.push({type:7,index:a}),e+=S.length-1}}a++}}static createElement(e,t){let n=C.createElement(`template`);return n.innerHTML=e,n}},we=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:t},parts:n}=this._$AD,r=(e?.creationScope??C).importNode(t,!0);F.currentNode=r;let i=F.nextNode(),a=0,o=0,s=n[0];for(;s!==void 0;){if(a===s.index){let t;s.type===2?t=new L(i,i.nextSibling,this,e):s.type===1?t=new s.ctor(i,s.name,s.strings,this,e):s.type===6&&(t=new Oe(i,this,e)),this._$AV.push(t),s=n[++o]}a!==s?.index&&(i=F.nextNode(),a++)}return F.currentNode=C,r}p(e){let t=0;for(let n of this._$AV)n!==void 0&&(n.strings===void 0?n._$AI(e[t]):(n._$AI(e,n,t),t+=n.strings.length-2)),t++}},L=class e{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,n,r){this.type=2,this._$AH=P,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=n,this.options=r,this._$Cv=r?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=y(this,e,t),T(e)?e===P||e==null||e===``?(this._$AH!==P&&this._$AR(),this._$AH=P):e!==this._$AH&&e!==N&&this._(e):e._$litType$===void 0?e.nodeType===void 0?ge(e)?this.k(e):this._(e):this.T(e):this.$(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==P&&T(this._$AH)?this._$AA.nextSibling.data=e:this.T(C.createTextNode(e)),this._$AH=e}$(e){let{values:t,_$litType$:n}=e,r=typeof n==`number`?this._$AC(e):(n.el===void 0&&(n.el=I.createElement(ue(n.h,n.h[0]),this.options)),n);if(this._$AH?._$AD===r)this._$AH.p(t);else{let e=new we(r,this),n=e.u(this.options);e.p(t),this.T(n),this._$AH=e}}_$AC(e){let t=Se.get(e.strings);return t===void 0&&Se.set(e.strings,t=new I(e)),t}k(t){E(this._$AH)||(this._$AH=[],this._$AR());let n=this._$AH,r,i=0;for(let a of t)i===n.length?n.push(r=new e(this.O(w()),this.O(w()),this,this.options)):r=n[i],r._$AI(a),i++;i<n.length&&(this._$AR(r&&r._$AB.nextSibling,i),n.length=i)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){let t=de(e).nextSibling;de(e).remove(),e=t}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}},R=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,n,r,i){this.type=1,this._$AH=P,this._$AN=void 0,this.element=e,this.name=t,this._$AM=r,this.options=i,n.length>2||n[0]!==``||n[1]!==``?(this._$AH=Array(n.length-1).fill(/* @__PURE__ */ new String),this.strings=n):this._$AH=P}_$AI(e,t=this,n,r){let i=this.strings,a=!1;if(i===void 0)e=y(this,e,t,0),a=!T(e)||e!==this._$AH&&e!==N,a&&(this._$AH=e);else{let r=e,o,s;for(e=i[0],o=0;o<i.length-1;o++)s=y(this,r[n+o],t,o),s===N&&(s=this._$AH[o]),a||=!T(s)||s!==this._$AH[o],s===P?e=P:e!==P&&(e+=(s??``)+i[o+1]),this._$AH[o]=s}a&&!r&&this.j(e)}j(e){e===P?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??``)}},Te=class extends R{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===P?void 0:e}},Ee=class extends R{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==P)}},De=class extends R{constructor(e,t,n,r,i){super(e,t,n,r,i),this.type=5}_$AI(e,t=this){if((e=y(this,e,t,0)??P)===N)return;let n=this._$AH,r=e===P&&n!==P||e.capture!==n.capture||e.once!==n.once||e.passive!==n.passive,i=e!==P&&(n===P||r);r&&this.element.removeEventListener(this.name,this,n),i&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH==`function`?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},Oe=class{constructor(e,t,n){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=n}get _$AU(){return this._$AM._$AU}_$AI(e){y(this,e)}},ke=b.litHtmlPolyfillSupport,ke?.(I,L),(b.litHtmlVersions??=[]).push(`3.3.3`),Ae=(e,t,n)=>{let r=n?.renderBefore??t,i=r._$litPart$;if(i===void 0){let e=n?.renderBefore??null;r._$litPart$=i=new L(t.insertBefore(w(),e),e,void 0,n??{})}return i._$AI(e),i}})),z,B,Me,Ne=t((()=>{
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
le(),le(),je(),je(),z=globalThis,B=class extends v{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=Ae(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return N}},B._$litElement$=!0,B.finalized=!0,z.litElementHydrateSupport?.({LitElement:B}),Me=z.litElementPolyfillSupport,Me?.({LitElement:B}),(z.litElementVersions??=[]).push(`4.2.2`)})),Pe=t((()=>{})),V=t((()=>{
/**
* @license
* Copyright 2022 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
le(),je(),Ne(),Pe()})),Fe,Ie=t((()=>{Fe=e=>(t,n)=>{
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
n===void 0?customElements.define(e,t):n.addInitializer(()=>{customElements.define(e,t)})}}));
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
function Le(e){return(t,n)=>typeof n==`object`?ze(e,t,n):((e,t,n)=>{let r=t.hasOwnProperty(n);return t.constructor.createProperty(n,e),r?Object.getOwnPropertyDescriptor(t,n):void 0})(e,t,n)}var Re,ze,Be=t((()=>{le(),Re={attribute:!0,type:String,converter:g,reflect:!1,hasChanged:_},ze=(e=Re,t,n)=>{let{kind:r,metadata:i}=n,a=globalThis.litPropertyMetadata.get(i);if(a===void 0&&globalThis.litPropertyMetadata.set(i,a=/* @__PURE__ */ new Map),r===`setter`&&((e=Object.create(e)).wrapped=!0),a.set(n.name,e),r===`accessor`){let{name:r}=n;return{set(n){let i=t.get.call(this);t.set.call(this,n),this.requestUpdate(r,i,e,!0,n)},init(t){return t!==void 0&&this.C(r,void 0,e,t),t}}}if(r===`setter`){let{name:r}=n;return function(n){let i=this[r];t.call(this,n),this.requestUpdate(r,i,e,!0,n)}}throw Error(`Unsupported decorator location: `+r)}}));
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/function H(e){return Le({...e,state:!0,attribute:!1})}var Ve=t((()=>{Be()})),He=t((()=>{})),Ue=t((()=>{
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
})),We=t((()=>{
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
})),Ge=t((()=>{
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
})),Ke=t((()=>{
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
})),qe=t((()=>{
/**
* @license
* Copyright 2021 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
})),Je=t((()=>{
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
Ie(),Be(),Ve(),He(),Ue(),We(),Ge(),Ke(),qe()}));Je(),V();const Ye=l`
  :host {
    /* Required for light-dark() below to resolve against HA's active theme. */
    color-scheme: light dark;

    /* Brand accent. Deep lake teal rather than pool blue: Austrian bathing
       lakes read green-teal, and this hue also has to sit beside the success
       green without being confusable with it. Validated, not eyeballed --
       an earlier #0e7c6b was only delta-E 7.8 from --success-color in normal
       vision, which is below the readable floor. #0a7ea4 measures 16.6. */
    --bade-accent: #0a7ea4;

    /* Semantic states layered over HA's flat semantic colours, so a theme
       author recolours the whole portfolio at once. */
    --bade-ok: var(--success-color, #2e7d32);
    --bade-warn: var(--warning-color, #f57c00);
    --bade-alert: var(--error-color, #c62828);

    /* A FILLED danger surface needs a fill + foreground pair, not the flat
       semantic colour above. Measured on the live box: the flat
       --error-color is #db4437, and white on it is 4.29:1 -- under the 4.5:1
       WCAG 1.4.3 floor for normal text. Our own #c62828 fallback is 5.62:1,
       so testing against the fallback said everything was fine while every
       themed install shipped failing contrast.

       HA's design system has a matched pair for exactly this. Light mode
       resolves to red-50 #dc3146 (white -> 4.59:1) and dark to red-40
       #b30532 (white -> 7.04:1), so the contrast becomes HA's problem to
       keep correct rather than ours to re-measure per theme. */
    --bade-alert-fill: var(--ha-color-fill-danger-loud-resting, #c62828);
    --bade-on-alert: var(--ha-color-on-danger-loud, #fff);

    /* The unsampled part of the season track. */
    --bade-track: light-dark(#e4e9ea, #262b2d);

    --bade-pad-x: var(--ha-space-4, 16px);
    --bade-pad-y: var(--ha-space-4, 16px);
    --bade-gap: var(--ha-space-2, 8px);
    --bade-radius-sm: var(--ha-border-radius-sm, 4px);
    --bade-radius-md: var(--ha-border-radius-md, 8px);

    display: block;
  }

  ha-card {
    /* The card can sit in a 280px sidebar column or a full-width section, and
       it must reflow to its own width rather than the viewport's. */
    container-type: inline-size;
    overflow: hidden;
  }

  .body {
    padding: var(--bade-pad-y) var(--bade-pad-x);
  }

  /* -- photo header ----------------------------------------------------- */

  .hero {
    /* The shade is the lake at dusk rather than neutral black: the accent's
       hue taken down to near-black, so the darkening reads as part of the
       photo instead of a grey film over it. */
    --bade-shade: 4 22 28;
    --bade-scrim: rgb(var(--bade-shade) / 0.62);
    /* Room the temperature column claims, the fade each scrim spends inside
       its own padding, and the band above and below the temperature that
       keeps it clear of the info button while staying exactly centred. */
    --hero-reading-w: 7.5rem;
    --hero-fade: 2.5rem;
    --hero-clear: 2.75rem;
    /* An eased fade rather than a straight one: a linear ramp from 62% to
       nothing leaves a visible edge where it starts, and the scrim reads as a
       panel laid on the photo instead of shade within it. */
    --hero-fade-stops: rgb(var(--bade-shade) / 0.46)
        calc(100% - var(--hero-fade) * 0.75),
      rgb(var(--bade-shade) / 0.28) calc(100% - var(--hero-fade) * 0.5),
      rgb(var(--bade-shade) / 0.11) calc(100% - var(--hero-fade) * 0.25),
      transparent;

    position: relative;
    isolation: isolate;
    color: #fff;
  }

  /* Every photo is built at 600x210 (20:7). The ratio is pinned here too, so
     the card keeps its height while the image loads; the minimum height gives
     the overlay room in a narrow column, where the sides are cropped instead. */
  .hero-img {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 20 / 7;
    min-height: 8.5rem;
    object-fit: cover;
    background: var(--bade-track);
  }

  /* The vignette. Decoration only: none of the contrast below depends on it. */
  .hero::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(
      ellipse 90% 115% at 38% 35%,
      transparent 55%,
      rgb(var(--bade-shade) / 0.5) 100%
    );
  }

  /* CONTRAST, for every line of text on the photo. Each text block sits on
     its own scrim, sized to the block, at 62% of the shade: a band under the
     name, a halo behind the temperature. Composited over pure
     white -- the brightest thing a photo can put underneath -- that leaves
     rgb(99 111 114), relative luminance 0.152, and white on it measures
     5.19:1. That clears the 4.5:1 floor for normal text, so it holds for the
     12px lines as well as the large figure; 0.55 would not (4.11:1). Each
     fade lies outside the text, never under it. */
  .hero-caption {
    position: absolute;
    inset-inline: 0;
    bottom: 0;
    padding: var(--hero-fade)
      calc(var(--hero-reading-w) + var(--bade-pad-x) + var(--bade-gap))
      var(--ha-space-3, 12px) var(--bade-pad-x);
    background: linear-gradient(
      to top,
      var(--bade-scrim) calc(100% - var(--hero-fade)),
      var(--hero-fade-stops)
    );
  }

  /* Above the temperature's halo, which a long name can run into. */
  .hero-title,
  .hero-place {
    position: relative;
    z-index: 2;
  }

  .hero-title {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    margin: 0;
    font-size: var(--ha-font-size-xl, 1.429rem);
    font-weight: var(--ha-font-weight-bold, 600);
    line-height: 1.2;
    text-wrap: balance;
  }

  .hero-place {
    margin: 2px 0 0;
    font-size: var(--ha-font-size-s, 0.857rem);
  }

  /* Centred in the photo's height; the equal padding above and below keeps
     it clear of the info button without moving it off centre. */
  .hero-reading {
    position: absolute;
    inset-block: 0;
    right: 0;
    z-index: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-end;
    padding: var(--hero-clear) var(--bade-pad-x);
  }

  /* A halo rather than a column, so the darkening gathers around the
     temperature and fades into the vignette instead of standing as a panel.
     It is a blurred copy of the scrim, extended past the text by twice the
     blur: a Gaussian is back to 98% of full strength two deviations in from
     its edge, so the figures themselves sit on at least 0.61 and the 4.9:1
     above holds. A box-shadow was tried first and left a visible step, since
     its blur is centred on the box edge rather than outside it. */
  .hero-reading-box {
    --halo-blur: 0.75rem;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .hero-reading-box::before {
    content: "";
    position: absolute;
    inset: calc(-2 * var(--halo-blur) - 0.25rem);
    z-index: -1;
    border-radius: 2rem;
    background: var(--bade-scrim);
    filter: blur(var(--halo-blur));
  }

  .hero-temperature {
    display: flex;
    align-items: flex-start;
    gap: 2px;
    margin: 0;
    line-height: 1;
    white-space: nowrap;
  }

  /* The one loud element. Light weight and tabular figures, so 19,8 and 21,5
     take the same width and the column does not shift between samples. */
  .hero-value {
    font-size: var(--ha-font-size-5xl, 2.857rem);
    font-weight: var(--ha-font-weight-light, 300);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }

  .hero-unit {
    margin-top: 0.25em;
    font-size: var(--ha-font-size-l, 1.143rem);
  }

  .hero-sampled {
    margin: 6px 0 0;
    font-size: var(--ha-font-size-s, 0.857rem);
    white-space: nowrap;
  }

  /* The date lives on the photo; the body keeps a copy for narrow cards. */
  .reading-block.hero-fallback {
    display: none;
  }

  /* -- photo credit ----------------------------------------------------- */

  .photo-info {
    position: absolute;
    top: var(--bade-gap);
    right: var(--bade-gap);
    z-index: 3;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    max-width: calc(100% - 2 * var(--bade-gap));
  }

  /* 32px: over the 24px WCAG 2.5.8 minimum, and about a fingertip. The
     disc is its own backdrop, since the corner may be bright sky: at 55% of
     the shade, over pure white, the white icon measures 4.1:1, above the
     3:1 WCAG 1.4.11 asks of a control. */
  .photo-info-button {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: rgb(var(--bade-shade) / 0.55);
    color: #fff;
    cursor: pointer;
    --mdc-icon-size: 22px;
  }

  .photo-info-button:hover {
    background: rgb(var(--bade-shade) / 0.8);
  }

  /* The body's teal ring would disappear against the dark corner. */
  .photo-info-button:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 0;
  }

  /* Same look as the season-track tooltip. Not pointer-events: none, unlike
     that one: WCAG 1.4.13 asks that the pointer can move onto the tooltip
     without it closing, and the wrapper's hover covers both. */
  .photo-tip {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-width: 18rem;
    margin-top: 4px;
    padding: 6px 10px;
    border-radius: var(--bade-radius-sm);
    background: var(--ha-card-background, var(--card-background-color, #fff));
    border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
    box-shadow: var(--ha-card-box-shadow, 0 2px 6px rgba(0, 0, 0, 0.25));
    color: var(--primary-text-color);
    font-size: var(--ha-font-size-s, 0.857rem);
    line-height: 1.4;
  }

  .photo-tip[hidden] {
    display: none;
  }

  .photo-tip-source {
    color: var(--secondary-text-color);
  }

  /* The body opens with whatever the photo header did not take. */
  .body > :first-child {
    margin-top: 0;
  }

  /* -- heading ---------------------------------------------------------- */

  .title {
    margin: 0;
    font-size: var(--ha-font-size-l, 1.143rem);
    font-weight: var(--ha-font-weight-medium, 500);
    line-height: var(--ha-line-height-condensed, 1.2);
    color: var(--primary-text-color);
  }

  .place {
    margin: 2px 0 0;
    font-size: var(--ha-font-size-s, 0.857rem);
    color: var(--secondary-text-color);
  }

  /* -- closure banner --------------------------------------------------- */

  .closure {
    display: flex;
    align-items: center;
    gap: var(--bade-gap);
    padding: var(--ha-space-3, 12px) var(--bade-pad-x);
    background: var(--bade-alert-fill);
    color: var(--bade-on-alert);
    font-size: var(--ha-font-size-m, 1rem);
    font-weight: var(--ha-font-weight-medium, 500);
  }

  .closure ha-icon {
    flex: 0 0 auto;
  }

  .closure-reason {
    font-weight: var(--ha-font-weight-normal, 400);
    opacity: 0.92;
  }

  /* -- season track ----------------------------------------------------- */

  .season {
    margin-top: var(--ha-space-5, 20px);
  }

  /* Right-aligned, and deliberately so after a detour.
     
     An earlier version tried to anchor the reading exactly over the newest
     sample's dot. Exact anchoring is not achievable here: the newest sample
     is always near the end of the axis (the season closes 31 August), so a
     centred label at that position overflows the card and gets clipped. The
     proportional-spacer approximation that avoided clipping landed about
     60px short — too close to read as alignment, too far to read as an
     anchor, i.e. it just looked like a mistake.
     
     Right alignment lands near the newest dot anyway, for the same reason
     exact anchoring failed, and it reads as a deliberate edge rather than an
     accident. The date line underneath ties it to the series. */
  .reading-block {
    text-align: right;
  }

  .reading {
    display: flex;
    align-items: baseline;
    justify-content: flex-end;
    gap: var(--bade-gap);
    white-space: nowrap;
  }

  .sampled {
    margin: 2px 0 0;
    font-size: var(--ha-font-size-s, 0.857rem);
    color: var(--secondary-text-color);
  }

  .season-status {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: var(--ha-space-2, 8px);
    font-size: var(--ha-font-size-s, 0.857rem);
    color: var(--secondary-text-color);
  }

  /* -- readings --------------------------------------------------------- */

  .readings {
    display: grid;
    grid-template-columns: auto 1fr;
    column-gap: var(--ha-space-4, 16px);
    row-gap: var(--ha-space-2, 8px);
    margin-top: var(--ha-space-5, 20px);
    font-size: var(--ha-font-size-m, 1rem);
  }

  /* No tiles, no borders, no shadows. The grid alignment is the structure --
     six readings in six identical rounded boxes is the generic default and
     reads as a template. */
  .readings dt {
    color: var(--secondary-text-color);
    font-size: var(--ha-font-size-s, 0.857rem);
    align-self: baseline;
  }

  .readings dd {
    margin: 0;
    color: var(--primary-text-color);
    /* These DO align vertically row to row, so equal-width digits help. */
    font-variant-numeric: tabular-nums;
  }

  .unit {
    color: var(--secondary-text-color);
    font-size: var(--ha-font-size-s, 0.857rem);
    margin-left: 4px;
  }

  .qualifier {
    color: var(--secondary-text-color);
    font-size: var(--ha-font-size-s, 0.857rem);
    margin-left: var(--bade-gap);
  }

  /* -- attribution ------------------------------------------------------ */

  .attribution {
    margin-top: var(--ha-space-5, 20px);
    padding-top: var(--ha-space-3, 12px);
    border-top: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
    font-size: var(--ha-font-size-xs, 0.786rem);
    line-height: var(--ha-line-height-normal, 1.6);
    color: var(--secondary-text-color);
  }

  /* -- banners ---------------------------------------------------------- */

  .version-banner {
    display: flex;
    align-items: center;
    gap: var(--bade-gap);
    padding: var(--ha-space-2, 8px) var(--bade-pad-x);
    background: color-mix(in srgb, var(--bade-warn) 16%, transparent);
    color: var(--primary-text-color);
    font-size: var(--ha-font-size-s, 0.857rem);
  }

  .version-banner button {
    margin-left: auto;
    font: inherit;
    color: var(--primary-text-color);
    background: transparent;
    border: 1px solid currentColor;
    border-radius: var(--bade-radius-sm);
    padding: 4px 10px;
    cursor: pointer;
    /* WCAG 2.5.8: the minimum target is 24px, and this one clears it. */
    min-height: 24px;
  }

  /* The table-view twin of the season track: every plotted value is also
     reachable as text, so a tooltip is never the only way to read one. Not
     display:none -- that would hide it from screen readers too. */
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  :focus-visible {
    outline: 2px solid var(--bade-accent);
    outline-offset: 2px;
  }

  /* -- narrow columns --------------------------------------------------- */

  /* A sidebar column: a smaller figure, and the date moves off the photo to
     the body, where there is room for it. */
  @container (max-width: 360px) {
    .hero {
      --hero-reading-w: 4.5rem;
    }
    .hero-value {
      font-size: var(--ha-font-size-3xl, 2rem);
    }
    .hero-sampled {
      display: none;
    }
    .reading-block.hero-fallback {
      display: block;
    }
  }

  @container (max-width: 320px) {
    .readings {
      grid-template-columns: 1fr;
      row-gap: 2px;
    }
    .readings dd {
      margin-bottom: var(--ha-space-2, 8px);
    }
    .temperature {
      font-size: var(--ha-font-size-2xl, 1.429rem);
    }
  }

  /* WCAG 2.3.3. HA's own theme already collapses its animation-duration
     tokens under this query, but the card must not rely on the theme doing
     it -- a custom theme may not. */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      transition: none !important;
      animation: none !important;
    }
  }

  /* Windows High Contrast: keep the track readable when the theme colours
     are replaced wholesale. */
  @media (forced-colors: active) {
    .closure {
      border: 1px solid CanvasText;
    }
  }
`;function Xe(e){return{type:``,...Ze,...e}}function U(e,t){if(t){if(t.device)return t.device;if(t.entity)return e?.entities?.[t.entity]?.device_id}}var Ze,Qe=t((()=>{Ze={show_photo:!0,show_season_track:!0,show_readings:!0}}));Qe();const $e=`badegewaesser-austria-card`;var et={card:{season_over:`Saison beendet`,in_season:`Badesaison läuft`,no_samples:`Noch keine Proben in dieser Saison`,closed:`Baden verboten`,sampled_on:`Probe vom {date}`,not_measured:`nicht gemessen`,season_axis_label:`Proben der Saison {year}`,water_quality:`Wasserqualität`,e_coli:`E. coli`,enterococci:`Enterokokken`,secchi_depth:`Sichttiefe`,water_temperature:`Wassertemperatur`,rating_year:`Bewertung {year}`,no_rating:`noch nicht bewertet`,below_limit:`unter der Nachweisgrenze`,attribution:`Datenquelle: AGES · CC BY 3.0 AT`,photo_alt:`Badestelle {name}`,photo_credit:`Fotonachweis`,photo_source:`Quelle: AGES Badegewässer-Monitoring`},quality:{excellent:`Ausgezeichnet`,good:`Gut`,sufficient:`Ausreichend`,poor:`Mangelhaft`},error:{entity_missing:`Die Entität {entity} gibt es nicht mehr. Wähle im Karteneditor eine andere aus.`,not_this_integration:`{entity} gehört nicht zu Badegewässer Austria. Wähle eine Entität dieser Integration.`,no_device:`Wähle im Karteneditor ein Badegewässer aus.`,device_missing:`Dieses Badegewässer gibt es nicht mehr. Wähle im Karteneditor ein anderes aus.`},version:{mismatch:`Diese Karte ist veraltet ({card} statt {integration}).`,reload:`Neu laden`},editor:{device:`Badegewässer`,device_helper:`Welchen See oder Fluss die Karte zeigen soll.`,name:`Titel`,name_helper:`Leer lassen, um den Namen des Badegewässers zu verwenden.`,show_photo:`Foto zeigen`,show_photo_helper:`Ein Bild der Badestelle, sofern es eines gibt.`,show_season_track:`Saisonverlauf zeigen`,show_season_track_helper:`Die Proben der Saison als Zeitachse.`,show_readings:`Messwerte zeigen`,show_readings_helper:`Wasserqualität, E. coli, Enterokokken und Sichttiefe.`}},tt={card:{season_over:`Season over`,in_season:`Bathing season under way`,no_samples:`No samples yet this season`,closed:`Swimming prohibited`,sampled_on:`Sampled {date}`,not_measured:`not measured`,season_axis_label:`Samples from the {year} season`,water_quality:`Water quality`,e_coli:`E. coli`,enterococci:`Enterococci`,secchi_depth:`Secchi depth`,water_temperature:`Water temperature`,rating_year:`{year} rating`,no_rating:`not yet rated`,below_limit:`below the detection limit`,attribution:`Data source: AGES · CC BY 3.0 AT`,photo_alt:`Bathing spot at {name}`,photo_credit:`Photo credit`,photo_source:`Source: AGES bathing-water monitoring`},quality:{excellent:`Excellent`,good:`Good`,sufficient:`Sufficient`,poor:`Poor`},error:{entity_missing:`The entity {entity} no longer exists. Pick another one in the card editor.`,not_this_integration:`{entity} isn't part of Badegewässer Austria. Pick an entity from this integration.`,no_device:`Pick a bathing water in the card editor.`,device_missing:`That bathing water no longer exists. Pick another one in the card editor.`},version:{mismatch:`This card is out of date ({card} instead of {integration}).`,reload:`Reload`},editor:{device:`Bathing water`,device_helper:`Which lake or river the card should show.`,name:`Title`,name_helper:`Leave empty to use the bathing water's own name.`,show_photo:`Show the photo`,show_photo_helper:`A picture of the bathing spot, where there is one.`,show_season_track:`Show the season track`,show_season_track_helper:`This season's samples on a time axis.`,show_readings:`Show the readings`,show_readings_helper:`Water quality, E. coli, enterococci and Secchi depth.`}};function W(e,t,n={}){let r=(t??G).toLowerCase().split(`-`)[0]??G,[i,a]=e.split(`.`),o=nt[r]??nt[G],s=nt[G],c=e=>i&&a?e?.[i]?.[a]:void 0,l=c(o)??c(s)??e;return Object.entries(n).reduce((e,[t,n])=>e.replaceAll(`{${t}}`,String(n)),l)}var nt,G,rt=t((()=>{nt={de:et,en:tt},G=`en`}));V(),rt();const it={month:5,day:15},at={month:8,day:31},ot=[5,6,7,8],st=e=>{let t=Date.UTC(e.getUTCFullYear(),0,1),n=Date.UTC(e.getUTCFullYear(),e.getUTCMonth(),e.getUTCDate());return Math.round((n-t)/864e5)};function ct(e){let t=e.getUTCFullYear(),n=st(new Date(Date.UTC(t,it.month-1,it.day))),r=st(new Date(Date.UTC(t,at.month-1,at.day)))-n;return r<=0?0:Math.min(1,Math.max(0,(st(e)-n)/r))}const lt=e=>{let t=/* @__PURE__ */ new Date(`${e}T00:00:00Z`);return Number.isNaN(t.getTime())?null:t},K=e=>`${(e*100).toFixed(3)}%`;function ut(e){let{samples:t,formatDate:n,formatTemperature:r,language:i}=e;return t.length===0?W(`card.no_samples`,i):t.map(e=>{let t=lt(e.date);return`${t?n(t):e.date}: ${r(e.water_temperature)}`}).join(`, `)}function dt(e){let{samples:t,now:n,language:r,formatDate:i,formatTemperature:a,hovered:o,onHover:s}=e,c=ct(n),l=t.map(e=>({sample:e,date:lt(e.date)})).filter(e=>e.date!==null).map(e=>({...e,cx:K(ct(e.date))})),u=l.length-1,d=o==null?void 0:l[o],f=l.at(-1)?.date.getUTCFullYear()??n.getUTCFullYear(),p=e=>new Intl.DateTimeFormat(r??`en`,{month:`short`,timeZone:`UTC`}).format(new Date(Date.UTC(f,e-1,15)));return j`
    <div class="track-wrap">
      <!-- role="group", not "img". ARIA makes every descendant of an img
           presentational, so the focusable, labelled points below would take
           keyboard focus and announce nothing (axe: nested-interactive,
           WCAG 4.1.2). A group keeps the axis label AND exposes the points. -->
      <svg
        class="track"
        role="group"
        aria-label=${W(`card.season_axis_label`,r,{year:f})}
      >
        <!-- Solid hairlines only. A dashed rule reads as a threshold or a
             projection when it is just an axis. -->
        ${M`<line
          class="track-ground"
          x1=${K(0)} y1=${14} x2=${K(1)} y2=${14}
        />`}
        ${M`<line
          class="track-filled"
          x1=${K(0)} y1=${14} x2=${K(c)} y2=${14}
        />`}
        ${ot.map((e,t)=>{let n=ct(new Date(Date.UTC(f,e-1,t===0?it.day:1)));return M`<text
            class="month"
            x=${K(n)}
            y=${38}
            text-anchor=${t===0?`start`:`middle`}
          >${p(e)}</text>`})}
        ${l.map((e,t)=>M`
            <g
              class=${t===u?`point is-latest`:`point`}
              tabindex="0"
              role="img"
              aria-label=${`${i(e.date)}: ${a(e.sample.water_temperature)}`}
              @pointerenter=${()=>s?.(t)}
              @pointerleave=${()=>s?.(null)}
              @focus=${()=>s?.(t)}
              @blur=${()=>s?.(null)}
            >
              <circle
                class="dot"
                cx=${e.cx}
                cy=${14}
                r=${t===u?6:4}
              />
              <circle class="hit" cx=${e.cx} cy=${14} r=${12} />
            </g>
          `)}
      </svg>
      ${d?j`<div
            class="tip"
            role="status"
            style=${`--tip-x:${d.cx}`}
          >
            <span class="tip-date">${i(d.date)}</span>
            <span class="tip-value"
              >${a(d.sample.water_temperature)}</span
            >
          </div>`:P}
    </div>
  `}const ft=l`
  /* The inset the end dots need now that 0% and 100% are the real edges of
     the element rather than padded coordinates inside a viewBox. */
  .track-wrap {
    position: relative;
    padding-inline: 8px;
    margin-top: var(--ha-space-1, 4px);
  }

  /* An in-card tooltip rather than an SVG <title>. The native one renders as
     an OS tooltip box outside the card, unthemed and detached from the point
     it describes. This one sits above its dot, inherits the theme, and
     appears on keyboard focus as well as hover — the values also stay
     reachable as text in the visually-hidden twin, so it enhances rather than
     gates. */
  .tip {
    position: absolute;
    bottom: 26px;
    left: clamp(0px, var(--tip-x), 100%);
    translate: -50% 0;
    display: flex;
    gap: var(--ha-space-2, 8px);
    align-items: baseline;
    white-space: nowrap;
    padding: 4px 8px;
    border-radius: var(--bade-radius-sm, 4px);
    background: var(--ha-card-background, var(--card-background-color, #fff));
    border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
    box-shadow: var(--ha-card-box-shadow, 0 2px 6px rgba(0, 0, 0, 0.25));
    font-size: var(--ha-font-size-s, 0.857rem);
    pointer-events: none;
    z-index: 1;
  }

  .tip-date {
    color: var(--secondary-text-color);
  }

  .tip-value {
    color: var(--primary-text-color);
    font-variant-numeric: tabular-nums;
  }

  .point {
    cursor: default;
  }

  .point:focus-visible {
    outline: 2px solid var(--bade-accent);
    outline-offset: 2px;
    border-radius: var(--bade-radius-sm, 4px);
  }

  .track {
    display: block;
    width: 100%;
    /* Sized to include the month labels. A container that fits only the plot
       gives the card a tiny nested scrollbar instead of an axis.

       There is no viewBox on purpose, so one CSS pixel is one user unit: r=4
       draws a 8px CIRCLE at any card width. With a viewBox plus
       preserveAspectRatio="none" the x and y scales differ and every dot
       renders as a horizontally stretched ellipse. */
    height: 44px;
    overflow: visible;
  }

  .track-ground {
    stroke: var(--bade-track);
    stroke-width: 2;
    stroke-linecap: round;
  }

  .track-filled {
    stroke: var(--bade-accent);
    stroke-width: 2;
    stroke-linecap: round;
  }

  .dot {
    fill: var(--bade-accent);
    /* A 2px surface ring rather than a border, so overlapping dots separate
       without drawing an outline around every mark. */
    stroke: var(--ha-card-background, var(--card-background-color, #fff));
    stroke-width: 2;
  }

  .hit {
    fill: transparent;
    /* Pointer only; the group carries the accessible name. */
    pointer-events: all;
  }

  .month {
    fill: var(--secondary-text-color);
    font-size: 10px;
    font-family: var(--ha-font-family-body, inherit);
  }

  @media (forced-colors: active) {
    .track-filled,
    .dot {
      forced-color-adjust: none;
    }
  }
`;var pt,mt,q,J,ht,Y,gt,_t,vt=t((()=>{pt=`badegewaesser_austria`,mt=/* @__PURE__ */ new Set([`unknown`,`unavailable`,``,`none`]),q=e=>e!==void 0&&!mt.has(e.state.toLowerCase()),J=e=>{if(!q(e))return null;let t=Number(e?.state);return Number.isFinite(t)?t:null},ht=e=>e?.locale?.language??e?.language,Y=(e,t,n=1)=>e===null?null:new Intl.NumberFormat(t??`en`,{minimumFractionDigits:n,maximumFractionDigits:n}).format(e),gt=(e,t)=>new Intl.DateTimeFormat(t??`en`,{day:`numeric`,month:`long`,timeZone:`UTC`}).format(e),_t=(e,t,n)=>{let r=Y(e,n,0);return r===null?null:t?`<${r}`:r}}));function X(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a}var yt=t((()=>{})),bt,xt=t((()=>{bt=(e,t,n)=>{e.dispatchEvent(new CustomEvent(t,{detail:n,bubbles:!0,composed:!0}))}})),St=/* @__PURE__ */ n({BadegewaesserAustriaCardEditor:()=>Z}),Ct,Z,wt=t((()=>{V(),rt(),xt(),vt(),yt(),Ct=[{name:`device`,required:!0,selector:{device:{filter:{integration:pt}}}},{name:`name`,selector:{text:{}}},{type:`grid`,name:``,flatten:!0,schema:[{name:`show_photo`,selector:{boolean:{}}},{name:`show_season_track`,selector:{boolean:{}}},{name:`show_readings`,selector:{boolean:{}}}]}],Z=class extends B{constructor(...e){super(...e),this._computeLabel=e=>W(`editor.${e.name}`,ht(this.hass)),this._computeHelper=e=>{let t=`editor.${e.name}_helper`,n=W(t,ht(this.hass));return n===t?void 0:n}}setConfig(e){this._config=e}render(){return!this.hass||!this._config?P:j`
      <ha-form
        .hass=${this.hass}
        .data=${Xe(this._config)}
        .schema=${Ct}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `}_valueChanged(e){bt(this,`config-changed`,{config:e.detail.value})}},X([Le({attribute:!1})],Z.prototype,`hass`,void 0),X([H()],Z.prototype,`_config`,void 0),Z=X([Fe(`badegewaesser-austria-card-editor`)],Z)}));V(),Je(),Qe(),rt(),vt(),yt();const Q={temperature:`water_temperature`,quality:`water_quality`,eColi:`e_coli`,enterococci:`enterococci`,secchi:`secchi_depth`,lastSample:`last_sample`,closed:`closed`,season:`bathing_season`,photo:`photo`};let $=class extends B{constructor(...e){super(...e),this._hoveredPoint=null,this._photoTip=!1,this._photoTipHovered=!1,this._photoTipPinned=!1,this._versionChecked=!1}static{this.styles=[Ye,ft]}static async getConfigElement(){return await Promise.resolve().then(()=>(wt(),St)),document.createElement(`badegewaesser-austria-card-editor`)}static getStubConfig(e){return{device:Object.values(e.entities??{}).find(e=>e.platform===`badegewaesser_austria`&&e.device_id)?.device_id??``}}setConfig(e){if(!e)throw Error(W(`error.no_device`,void 0));this._config=Xe(e)}getCardSize(){return 4}getGridOptions(){return{columns:12,min_columns:6,rows:`auto`}}updated(){this._checkVersion()}async _checkVersion(){if(!this._versionChecked&&this.hass?.callWS){this._versionChecked=!0;try{let e=await this.hass.callWS({type:`${pt}/card_version`});e?.version&&e.version!==`0.1.0`&&(this._staleVersion=e.version)}catch{}}}async _reload(){try{if(`caches`in window){let e=await caches.keys();await Promise.all(e.map(e=>caches.delete(e)))}}catch{}location.reload()}_siteEntities(){let e=this.hass,t=U(e,this._config);if(!e||!t)return;let n={};for(let r of Object.values(e.entities??{}))r.device_id===t&&r.platform===`badegewaesser_austria`&&r.translation_key&&(n[r.translation_key]=e.states[r.entity_id]);return n}_deviceName(){let e=U(this.hass,this._config),t=e?this.hass?.devices?.[e]:void 0;return t?.name_by_user??t?.name}render(){let e=this._config,t=this.hass;if(!e||!t)return P;let n=ht(t);if(!e.device&&!e.entity)return this._renderAlert(W(`error.no_device`,n));if(!e.device&&e.entity){let r=t.entities?.[e.entity];if(!r||!t.states[e.entity])return this._renderAlert(W(`error.entity_missing`,n,{entity:e.entity}));if(r.platform!==`badegewaesser_austria`)return this._renderAlert(W(`error.not_this_integration`,n,{entity:e.entity}))}let r=this._siteEntities()??{};if(Object.keys(r).length===0)return this._renderAlert(W(`error.device_missing`,n));let i=r[Q.temperature],a=r[Q.closed],o=r[Q.season],s=e.name??this._deviceName()??``,c=i?.attributes.season_samples??[],l=o?.state===`on`,u=a?.state===`on`,d=r[Q.photo],f=e.show_photo===!1?void 0:this._photoUrl(d),p=f!==void 0&&this._photoFailed!==f;return j`
      <ha-card>
        ${p?this._renderHero(f,d,s,i,c,n):P}
        ${this._renderVersionBanner(n)}
        ${u?this._renderClosure(a,n):P}
        <div class="body">
          ${p?P:j`<h2 class="title">${s}</h2>
                ${this._renderPlace()}`}
          ${e.show_season_track===!1?P:this._renderSeason(i,c,l,n,p)}
          ${e.show_readings===!1?P:this._renderReadings(r,n)}
          <p class="attribution">${W(`card.attribution`,n)}</p>
        </div>
      </ha-card>
    `}_renderAlert(e){return j`
      <ha-card>
        <div class="body"><ha-alert alert-type="error">${e}</ha-alert></div>
      </ha-card>
    `}_renderVersionBanner(e){return this._staleVersion?j`
      <div class="version-banner">
        <ha-icon icon="mdi:refresh" aria-hidden="true"></ha-icon>
        <span
          >${W(`version.mismatch`,e,{card:`0.1.0`,integration:this._staleVersion})}</span
        >
        <button type="button" @click=${this._reload}>
          ${W(`version.reload`,e)}
        </button>
      </div>
    `:P}_renderClosure(e,t){let n=e?.attributes.closure_reason;return j`
      <div class="closure">
        <ha-icon icon="mdi:close-octagon" aria-hidden="true"></ha-icon>
        <span>${W(`card.closed`,t)}</span>
        ${typeof n==`string`&&n?j`<span class="closure-reason">${n}</span>`:P}
      </div>
    `}_renderHero(e,t,n,r,i,a){let o=t?.attributes.attribution,s=typeof o==`string`?o:``,c=U(this.hass,this._config),l=c?this.hass?.devices?.[c]?.model:void 0,u=Y(J(r),a),d=r?.attributes.unit_of_measurement,f=i.at(-1);return j`
      <div class="hero">
        <img
          class="hero-img"
          src=${e}
          alt=${W(`card.photo_alt`,a,{name:n})}
          width="600"
          height="210"
          decoding="async"
          @error=${()=>this._onPhotoError(e)}
        />
        <div class="hero-caption">
          <h2 class="hero-title">${n}</h2>
          ${l?j`<p class="hero-place">${l}</p>`:P}
        </div>
        <div class="hero-reading">
          <div class="hero-reading-box">
          <p class=${u===null?`hero-temperature is-missing`:`hero-temperature`}>
            <span class="hero-value">${u??`—`}</span>
            ${u!==null&&typeof d==`string`?j`<span class="hero-unit">${d}</span>`:P}
          </p>
          ${f?j`<p class="hero-sampled">
                ${W(`card.sampled_on`,a,{date:gt(/* @__PURE__ */ new Date(`${f.date}T00:00:00Z`),a)})}
              </p>`:P}
          </div>
        </div>
        ${s?this._renderPhotoCredit(s,a):P}
      </div>
    `}_renderPhotoCredit(e,t){let n=()=>{this._photoTip=this._photoTipHovered||this._photoTipPinned},r=()=>{this._photoTipHovered=!1,this._photoTipPinned=!1,n()};return j`
      <div
        class="photo-info"
        @pointerenter=${()=>{this._photoTipHovered=!0,n()}}
        @pointerleave=${()=>{this._photoTipHovered=!1,n()}}
      >
        <button
          type="button"
          class="photo-info-button"
          aria-label=${W(`card.photo_credit`,t)}
          aria-describedby="photo-tip"
          @click=${()=>{this._photoTipPinned=!this._photoTipPinned,n()}}
          @focus=${()=>{this._photoTipHovered=!0,n()}}
          @blur=${r}
          @keydown=${e=>{e.key===`Escape`&&r()}}
        >
          <ha-icon icon="mdi:information-outline" aria-hidden="true"></ha-icon>
        </button>
        <div class="photo-tip" id="photo-tip" role="tooltip" ?hidden=${!this._photoTip}>
          <span>${e}</span>
          <span class="photo-tip-source">${W(`card.photo_source`,t)}</span>
        </div>
      </div>
    `}_photoUrl(e){let t=e?.attributes.entity_picture;if(e&&q(e)&&typeof t==`string`)return this._photo?.state!==e.state&&(this._photo={state:e.state,url:t}),this._photo.url}_onPhotoError(e){let t=this._siteEntities()?.[Q.photo]?.attributes.entity_picture;if(typeof t==`string`&&t!==e){this._photo=void 0,this.requestUpdate();return}this._photoFailed=e}_renderPlace(){let e=U(this.hass,this._config),t=e?this.hass?.devices?.[e]?.model:void 0;return t?j`<p class="place">${t}</p>`:P}_renderSeason(e,t,n,r,i=!1){let a=J(e),o=Y(a,r),s=e?.attributes.unit_of_measurement,c=t.at(-1),l=c?/* @__PURE__ */ new Date(`${c.date}T00:00:00Z`):null,u={samples:t,now:/* @__PURE__ */ new Date,inSeason:n,language:r,formatDate:e=>gt(e,r),hovered:this._hoveredPoint,onHover:e=>{this._hoveredPoint=e},formatTemperature:e=>Y(e,r)===null?W(`card.not_measured`,r):`${Y(e,r)} ${typeof s==`string`?s:`°C`}`};return j`
      <div class="season">
        <div class=${i?`reading-block hero-fallback`:`reading-block`}>
          ${i?P:j`<div class="reading">
                <span class=${o===null?`temperature is-missing`:`temperature`}>
                  ${o??`—`}
                </span>
                ${o!==null&&typeof s==`string`?j`<span class="unit">${s}</span>`:P}
              </div>`}
          ${l?j`<p class="sampled">
                ${W(`card.sampled_on`,r,{date:gt(l,r)})}
              </p>`:P}
        </div>
        ${dt(u)}
        <p class="season-status">
          <ha-icon
            icon=${n?`mdi:swim`:`mdi:calendar-check`}
            aria-hidden="true"
          ></ha-icon>
          <span
            >${t.length===0?W(`card.no_samples`,r):W(n?`card.in_season`:`card.season_over`,r)}</span
          >
        </p>
        <p class="visually-hidden">${ut(u)}</p>
      </div>
    `}_renderReadings(e,t){let n=e[Q.quality],r=e[Q.eColi],i=e[Q.enterococci],a=e[Q.secchi],o=n?.attributes.rating_year,s=q(n)?W(`quality.${n?.state}`,t):W(`card.no_rating`,t);return j`
      <dl class="readings">
        <dt>${W(`card.water_quality`,t)}</dt>
        <dd>
          ${s}
          ${typeof o==`number`?j`<span class="qualifier"
                >${W(`card.rating_year`,t,{year:o})}</span
              >`:P}
        </dd>
        ${this._renderCount(Q.eColi,r,t)}
        ${this._renderCount(Q.enterococci,i,t)}
        <dt>${W(`card.secchi_depth`,t)}</dt>
        <dd>
          ${Y(J(a),t,2)??`—`}
          ${q(a)&&typeof a?.attributes.unit_of_measurement==`string`?j`<span class="unit">${a.attributes.unit_of_measurement}</span>`:P}
        </dd>
      </dl>
    `}_renderCount(e,t,n){let r=t?.attributes.below_detection_limit===!0,i=_t(J(t),r,n),a=t?.attributes.unit_of_measurement;return j`
      <dt>${W(`card.${e}`,n)}</dt>
      <dd>
        ${i??`—`}
        ${i!==null&&typeof a==`string`?j`<span class="unit">${a}</span>`:P}
        ${r?j`<span class="qualifier">${W(`card.below_limit`,n)}</span>`:P}
      </dd>
    `}};X([Le({attribute:!1})],$.prototype,`hass`,void 0),X([H()],$.prototype,`_config`,void 0),X([H()],$.prototype,`_staleVersion`,void 0),X([H()],$.prototype,`_hoveredPoint`,void 0),X([H()],$.prototype,`_photoTip`,void 0),X([H()],$.prototype,`_photoFailed`,void 0),$=X([Fe($e)],$);const Tt=window;Tt.customCards=Tt.customCards??[],Tt.customCards.push({type:$e,name:`Badegewässer Austria`,description:`Wasserqualität und Temperatur eines österreichischen Badegewässers`,preview:!0,documentationURL:`https://github.com/rolandzeiner/badegewaesser-austria`,getEntitySuggestion:(e,t)=>{let n=e.entities?.[t];return n?.platform!==`badegewaesser_austria`||!n.device_id?null:{config:{type:`custom:${$e}`,device:n.device_id}}}});export{$ as BadegewaesserAustriaCard};