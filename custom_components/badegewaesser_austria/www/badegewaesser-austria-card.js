/*! Badegewässer Austria — bundled by Rolldown. Edit sources in src/, then `npm run build`. */
var e=Object.defineProperty,t=(e,t,n)=>()=>{if(n)throw n[0];try{return e&&(t=e(e=0)),t}catch(e){throw n=[e],e}},n=(t,n)=>{let r={};for(var i in t)e(r,i,{get:t[i],enumerable:!0});return n||e(r,Symbol.toStringTag,{value:`Module`}),r},r,i,a,o,s,c,l,u,d,f=t((()=>{
/**
* @license
* Copyright 2019 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
r=globalThis,i=r.ShadowRoot&&(r.ShadyCSS===void 0||r.ShadyCSS.nativeShadow)&&`adoptedStyleSheets`in Document.prototype&&`replace`in CSSStyleSheet.prototype,a=Symbol(),o=/* @__PURE__ */ new WeakMap,s=class{constructor(e,t,n){if(this._$cssResult$=!0,n!==a)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o,t=this.t;if(i&&e===void 0){let n=t!==void 0&&t.length===1;n&&(e=o.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),n&&o.set(t,e))}return e}toString(){return this.cssText}},c=e=>new s(typeof e==`string`?e:e+``,void 0,a),l=(e,...t)=>{let n=e.length===1?e[0]:t.reduce((t,n,r)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if(typeof e==`number`)return e;throw Error(`Value passed to 'css' function must be a 'css' function result: `+e+`. Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.`)})(n)+e[r+1],e[0]);return new s(n,e,a)},u=(e,t)=>{if(i)e.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let n of t){let t=document.createElement(`style`),i=r.litNonce;i!==void 0&&t.setAttribute(`nonce`,i),t.textContent=n.cssText,e.appendChild(t)}},d=i?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t=``;for(let n of e.cssRules)t+=n.cssText;return c(t)})(e):e})),ee,te,ne,re,ie,ae,p,oe,se,ce,m,h,g,le,_,v=t((()=>{
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
f(),{is:ee,defineProperty:te,getOwnPropertyDescriptor:ne,getOwnPropertyNames:re,getOwnPropertySymbols:ie,getPrototypeOf:ae}=Object,p=globalThis,oe=p.trustedTypes,se=oe?oe.emptyScript:``,ce=p.reactiveElementPolyfillSupport,m=(e,t)=>e,h={toAttribute(e,t){switch(t){case Boolean:e=e?se:null;break;case Object:case Array:e=e==null?e:JSON.stringify(e)}return e},fromAttribute(e,t){let n=e;switch(t){case Boolean:n=e!==null;break;case Number:n=e===null?null:Number(e);break;case Object:case Array:try{n=JSON.parse(e)}catch{n=null}}return n}},g=(e,t)=>!ee(e,t),le={attribute:!0,type:String,converter:h,reflect:!1,useDefault:!1,hasChanged:g},Symbol.metadata??=Symbol(`metadata`),p.litPropertyMetadata??=/* @__PURE__ */ new WeakMap,_=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=le){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){let n=Symbol(),r=this.getPropertyDescriptor(e,n,t);r!==void 0&&te(this.prototype,e,r)}}static getPropertyDescriptor(e,t,n){let{get:r,set:i}=ne(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:r,set(t){let a=r?.call(this);i?.call(this,t),this.requestUpdate(e,a,n)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??le}static _$Ei(){if(this.hasOwnProperty(m(`elementProperties`)))return;let e=ae(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(m(`finalized`)))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(m(`properties`))){let e=this.properties,t=[...re(e),...ie(e)];for(let n of t)this.createProperty(n,e[n])}let e=this[Symbol.metadata];if(e!==null){let t=litPropertyMetadata.get(e);if(t!==void 0)for(let[e,n]of t)this.elementProperties.set(e,n)}this._$Eh=/* @__PURE__ */ new Map;for(let[e,t]of this.elementProperties){let n=this._$Eu(e,t);n!==void 0&&this._$Eh.set(n,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){let t=[];if(Array.isArray(e)){let n=new Set(e.flat(1/0).reverse());for(let e of n)t.unshift(d(e))}else e!==void 0&&t.push(d(e));return t}static _$Eu(e,t){let n=t.attribute;return!1===n?void 0:typeof n==`string`?n:typeof e==`string`?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=/* @__PURE__ */ new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=/* @__PURE__ */ new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){let e=/* @__PURE__ */ new Map,t=this.constructor.elementProperties;for(let n of t.keys())this.hasOwnProperty(n)&&(e.set(n,this[n]),delete this[n]);e.size>0&&(this._$Ep=e)}createRenderRoot(){let e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return u(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,n){this._$AK(e,n)}_$ET(e,t){let n=this.constructor.elementProperties.get(e),r=this.constructor._$Eu(e,n);if(r!==void 0&&!0===n.reflect){let i=(n.converter?.toAttribute===void 0?h:n.converter).toAttribute(t,n.type);this._$Em=e,i==null?this.removeAttribute(r):this.setAttribute(r,i),this._$Em=null}}_$AK(e,t){let n=this.constructor,r=n._$Eh.get(e);if(r!==void 0&&this._$Em!==r){let e=n.getPropertyOptions(r),i=typeof e.converter==`function`?{fromAttribute:e.converter}:e.converter?.fromAttribute===void 0?h:e.converter;this._$Em=r;let a=i.fromAttribute(t,e.type);this[r]=a??this._$Ej?.get(r)??a,this._$Em=null}}requestUpdate(e,t,n,r=!1,i){if(e!==void 0){let a=this.constructor;if(!1===r&&(i=this[e]),n??=a.getPropertyOptions(e),!((n.hasChanged??g)(i,t)||n.useDefault&&n.reflect&&i===this._$Ej?.get(e)&&!this.hasAttribute(a._$Eu(e,n))))return;this.C(e,t,n)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:n,reflect:r,wrapped:i},a){n&&!(this._$Ej??=/* @__PURE__ */ new Map).has(e)&&(this._$Ej.set(e,a??t??this[e]),!0!==i||a!==void 0)||(this._$AL.has(e)||(this.hasUpdated||n||(t=void 0),this._$AL.set(e,t)),!0===r&&this._$Em!==e&&(this._$Eq??=/* @__PURE__ */ new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}let e=this.constructor.elementProperties;if(e.size>0)for(let[t,n]of e){let{wrapped:e}=n,r=this[t];!0!==e||this._$AL.has(t)||r===void 0||this.C(t,void 0,n,r)}}let e=!1,t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=/* @__PURE__ */ new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}},_.elementStyles=[],_.shadowRootOptions={mode:`open`},_[m(`elementProperties`)]=/* @__PURE__ */ new Map,_[m(`finalized`)]=/* @__PURE__ */ new Map,ce?.({ReactiveElement:_}),(p.reactiveElementVersions??=[]).push(`2.1.2`)}));
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
function ue(e,t){if(!T(e)||!e.hasOwnProperty(`raw`))throw Error(`invalid template strings array`);return pe===void 0?t:pe.createHTML(t)}function y(e,t,n=e,r){if(t===M)return t;let i=r===void 0?n._$Cl:n._$Co?.[r],a=w(t)?void 0:t._$litDirective$;return i?.constructor!==a&&(i?._$AO?.(!1),a===void 0?i=void 0:(i=new a(e),i._$AT(e,n,r)),r===void 0?n._$Cl=i:(n._$Co??=[])[r]=i),i!==void 0&&(t=y(e,i._$AS(e,t.values),i,r)),t}var de,fe,b,pe,me,x,he,ge,S,C,w,T,_e,E,D,ve,ye,O,be,xe,Se,k,A,j,M,N,Ce,P,we,F,Te,I,L,Ee,De,Oe,ke,Ae,je,Me=t((()=>{de=globalThis,fe=e=>e,b=de.trustedTypes,pe=b?b.createPolicy(`lit-html`,{createHTML:e=>e}):void 0,me=`$lit$`,x=`lit$${Math.random().toFixed(9).slice(2)}$`,he=`?`+x,ge=`<${he}>`,S=document,C=()=>S.createComment(``),w=e=>e===null||typeof e!=`object`&&typeof e!=`function`,T=Array.isArray,_e=e=>T(e)||typeof e?.[Symbol.iterator]==`function`,E=`[ 	
\f\r]`,D=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,ve=/-->/g,ye=/>/g,O=RegExp(`>|${E}(?:([^\\s"'>=/]+)(${E}*=${E}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,`g`),be=/'/g,xe=/"/g,Se=/^(?:script|style|textarea|title)$/i,k=e=>(t,...n)=>({_$litType$:e,strings:t,values:n}),A=k(1),j=k(2),k(3),M=Symbol.for(`lit-noChange`),N=Symbol.for(`lit-nothing`),Ce=/* @__PURE__ */ new WeakMap,P=S.createTreeWalker(S,129),we=(e,t)=>{let n=e.length-1,r=[],i,a=t===2?`<svg>`:t===3?`<math>`:``,o=D;for(let t=0;t<n;t++){let n=e[t],s,c,l=-1,u=0;for(;u<n.length&&(o.lastIndex=u,c=o.exec(n),c!==null);)u=o.lastIndex,o===D?c[1]===`!--`?o=ve:c[1]===void 0?c[2]===void 0?c[3]!==void 0&&(o=O):(Se.test(c[2])&&(i=RegExp(`</`+c[2],`g`)),o=O):o=ye:o===O?c[0]===`>`?(o=i??D,l=-1):c[1]===void 0?l=-2:(l=o.lastIndex-c[2].length,s=c[1],o=c[3]===void 0?O:c[3]===`"`?xe:be):o===xe||o===be?o=O:o===ve||o===ye?o=D:(o=O,i=void 0);let d=o===O&&e[t+1].startsWith(`/>`)?` `:``;a+=o===D?n+ge:l>=0?(r.push(s),n.slice(0,l)+me+n.slice(l)+x+d):n+x+(l===-2?t:d)}return[ue(e,a+(e[n]||`<?>`)+(t===2?`</svg>`:t===3?`</math>`:``)),r]},F=class e{constructor({strings:t,_$litType$:n},r){let i;this.parts=[];let a=0,o=0,s=t.length-1,c=this.parts,[l,u]=we(t,n);if(this.el=e.createElement(l,r),P.currentNode=this.el.content,n===2||n===3){let e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;(i=P.nextNode())!==null&&c.length<s;){if(i.nodeType===1){if(i.hasAttributes())for(let e of i.getAttributeNames())if(e.endsWith(me)){let t=u[o++],n=i.getAttribute(e).split(x),r=/([.?@])?(.*)/.exec(t);c.push({type:1,index:a,name:r[2],strings:n,ctor:r[1]===`.`?Ee:r[1]===`?`?De:r[1]===`@`?Oe:L}),i.removeAttribute(e)}else e.startsWith(x)&&(c.push({type:6,index:a}),i.removeAttribute(e));if(Se.test(i.tagName)){let e=i.textContent.split(x),t=e.length-1;if(t>0){i.textContent=b?b.emptyScript:``;for(let n=0;n<t;n++)i.append(e[n],C()),P.nextNode(),c.push({type:2,index:++a});i.append(e[t],C())}}}else if(i.nodeType===8){if(i.data===he)c.push({type:2,index:a});else{let e=-1;for(;(e=i.data.indexOf(x,e+1))!==-1;)c.push({type:7,index:a}),e+=x.length-1}}a++}}static createElement(e,t){let n=S.createElement(`template`);return n.innerHTML=e,n}},Te=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:t},parts:n}=this._$AD,r=(e?.creationScope??S).importNode(t,!0);P.currentNode=r;let i=P.nextNode(),a=0,o=0,s=n[0];for(;s!==void 0;){if(a===s.index){let t;s.type===2?t=new I(i,i.nextSibling,this,e):s.type===1?t=new s.ctor(i,s.name,s.strings,this,e):s.type===6&&(t=new ke(i,this,e)),this._$AV.push(t),s=n[++o]}a!==s?.index&&(i=P.nextNode(),a++)}return P.currentNode=S,r}p(e){let t=0;for(let n of this._$AV)n!==void 0&&(n.strings===void 0?n._$AI(e[t]):(n._$AI(e,n,t),t+=n.strings.length-2)),t++}},I=class e{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,n,r){this.type=2,this._$AH=N,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=n,this.options=r,this._$Cv=r?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=y(this,e,t),w(e)?e===N||e==null||e===``?(this._$AH!==N&&this._$AR(),this._$AH=N):e!==this._$AH&&e!==M&&this._(e):e._$litType$===void 0?e.nodeType===void 0?_e(e)?this.k(e):this._(e):this.T(e):this.$(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==N&&w(this._$AH)?this._$AA.nextSibling.data=e:this.T(S.createTextNode(e)),this._$AH=e}$(e){let{values:t,_$litType$:n}=e,r=typeof n==`number`?this._$AC(e):(n.el===void 0&&(n.el=F.createElement(ue(n.h,n.h[0]),this.options)),n);if(this._$AH?._$AD===r)this._$AH.p(t);else{let e=new Te(r,this),n=e.u(this.options);e.p(t),this.T(n),this._$AH=e}}_$AC(e){let t=Ce.get(e.strings);return t===void 0&&Ce.set(e.strings,t=new F(e)),t}k(t){T(this._$AH)||(this._$AH=[],this._$AR());let n=this._$AH,r,i=0;for(let a of t)i===n.length?n.push(r=new e(this.O(C()),this.O(C()),this,this.options)):r=n[i],r._$AI(a),i++;i<n.length&&(this._$AR(r&&r._$AB.nextSibling,i),n.length=i)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){let t=fe(e).nextSibling;fe(e).remove(),e=t}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}},L=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,n,r,i){this.type=1,this._$AH=N,this._$AN=void 0,this.element=e,this.name=t,this._$AM=r,this.options=i,n.length>2||n[0]!==``||n[1]!==``?(this._$AH=Array(n.length-1).fill(/* @__PURE__ */ new String),this.strings=n):this._$AH=N}_$AI(e,t=this,n,r){let i=this.strings,a=!1;if(i===void 0)e=y(this,e,t,0),a=!w(e)||e!==this._$AH&&e!==M,a&&(this._$AH=e);else{let r=e,o,s;for(e=i[0],o=0;o<i.length-1;o++)s=y(this,r[n+o],t,o),s===M&&(s=this._$AH[o]),a||=!w(s)||s!==this._$AH[o],s===N?e=N:e!==N&&(e+=(s??``)+i[o+1]),this._$AH[o]=s}a&&!r&&this.j(e)}j(e){e===N?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??``)}},Ee=class extends L{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===N?void 0:e}},De=class extends L{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==N)}},Oe=class extends L{constructor(e,t,n,r,i){super(e,t,n,r,i),this.type=5}_$AI(e,t=this){if((e=y(this,e,t,0)??N)===M)return;let n=this._$AH,r=e===N&&n!==N||e.capture!==n.capture||e.once!==n.once||e.passive!==n.passive,i=e!==N&&(n===N||r);r&&this.element.removeEventListener(this.name,this,n),i&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH==`function`?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},ke=class{constructor(e,t,n){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=n}get _$AU(){return this._$AM._$AU}_$AI(e){y(this,e)}},Ae=de.litHtmlPolyfillSupport,Ae?.(F,I),(de.litHtmlVersions??=[]).push(`3.3.3`),je=(e,t,n)=>{let r=n?.renderBefore??t,i=r._$litPart$;if(i===void 0){let e=n?.renderBefore??null;r._$litPart$=i=new I(t.insertBefore(C(),e),e,void 0,n??{})}return i._$AI(e),i}})),R,z,Ne,Pe=t((()=>{
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
v(),v(),Me(),Me(),R=globalThis,z=class extends _{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=je(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return M}},z._$litElement$=!0,z.finalized=!0,R.litElementHydrateSupport?.({LitElement:z}),Ne=R.litElementPolyfillSupport,Ne?.({LitElement:z}),(R.litElementVersions??=[]).push(`4.2.2`)})),Fe=t((()=>{})),B=t((()=>{
/**
* @license
* Copyright 2022 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
v(),Me(),Pe(),Fe()})),Ie,Le=t((()=>{Ie=e=>(t,n)=>{
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
function Re(e){return(t,n)=>typeof n==`object`?Be(e,t,n):((e,t,n)=>{let r=t.hasOwnProperty(n);return t.constructor.createProperty(n,e),r?Object.getOwnPropertyDescriptor(t,n):void 0})(e,t,n)}var ze,Be,Ve=t((()=>{v(),ze={attribute:!0,type:String,converter:h,reflect:!1,hasChanged:g},Be=(e=ze,t,n)=>{let{kind:r,metadata:i}=n,a=globalThis.litPropertyMetadata.get(i);if(a===void 0&&globalThis.litPropertyMetadata.set(i,a=/* @__PURE__ */ new Map),r===`setter`&&((e=Object.create(e)).wrapped=!0),a.set(n.name,e),r===`accessor`){let{name:r}=n;return{set(n){let i=t.get.call(this);t.set.call(this,n),this.requestUpdate(r,i,e,!0,n)},init(t){return t!==void 0&&this.C(r,void 0,e,t),t}}}if(r===`setter`){let{name:r}=n;return function(n){let i=this[r];t.call(this,n),this.requestUpdate(r,i,e,!0,n)}}throw Error(`Unsupported decorator location: `+r)}}));
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/function V(e){return Re({...e,state:!0,attribute:!1})}var He=t((()=>{Ve()})),Ue=t((()=>{})),We=t((()=>{
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
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
})),Je=t((()=>{
/**
* @license
* Copyright 2021 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
})),Ye=t((()=>{
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
Le(),Ve(),He(),Ue(),We(),Ge(),Ke(),qe(),Je()}));Ye(),B();const Xe=l`
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

  /* -- photo ------------------------------------------------------------ */

  .photo {
    position: relative;
    margin: 0;
  }

  /* Every photo is built at 600x210 (20:7). The ratio is pinned here as well,
     so the card keeps its height while the image loads instead of jumping. */
  .photo img {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 20 / 7;
    object-fit: cover;
    background: var(--bade-track);
  }

  /* The credit sits on the photo because it belongs to the photo. The scrim
     keeps white text legible over any picture: over pure white, 60% black
     leaves #666, and white on #666 is 5.7:1 -- above the 4.5:1 floor. */
  .photo-credit {
    position: absolute;
    right: 0;
    bottom: 0;
    max-width: 100%;
    box-sizing: border-box;
    padding: 2px var(--bade-gap);
    border-top-left-radius: var(--bade-radius-sm);
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    font-size: var(--ha-font-size-s, 0.857rem);
    line-height: 1.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Inset, because the card clips anything past its edge. */
  .photo-credit:focus-visible {
    outline-offset: -2px;
  }

  /* Same look as the season-track tooltip, anchored above the credit. */
  .photo-tip {
    position: absolute;
    right: var(--bade-gap);
    bottom: 28px;
    max-width: calc(100% - 2 * var(--bade-gap));
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 4px 8px;
    border-radius: var(--bade-radius-sm);
    background: var(--ha-card-background, var(--card-background-color, #fff));
    border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
    box-shadow: var(--ha-card-box-shadow, 0 2px 6px rgba(0, 0, 0, 0.25));
    color: var(--primary-text-color);
    font-size: var(--ha-font-size-s, 0.857rem);
    pointer-events: none;
    z-index: 1;
  }

  .photo-tip-source {
    color: var(--secondary-text-color);
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
`;function Ze(e){return{type:``,...$e,...e}}function Qe(e,t){if(t){if(t.device)return t.device;if(t.entity)return e?.entities?.[t.entity]?.device_id}}var $e,et=t((()=>{$e={show_photo:!0,show_season_track:!0,show_readings:!0}}));et();const tt=`badegewaesser-austria-card`;var nt={card:{season_over:`Saison beendet`,in_season:`Badesaison läuft`,no_samples:`Noch keine Proben in dieser Saison`,closed:`Baden verboten`,sampled_on:`Probe vom {date}`,not_measured:`nicht gemessen`,season_axis_label:`Proben der Saison {year}`,water_quality:`Wasserqualität`,e_coli:`E. coli`,enterococci:`Enterokokken`,secchi_depth:`Sichttiefe`,water_temperature:`Wassertemperatur`,rating_year:`Bewertung {year}`,no_rating:`noch nicht bewertet`,below_limit:`unter der Nachweisgrenze`,attribution:`Datenquelle: AGES · CC BY 3.0 AT`,photo_alt:`Badestelle {name}`,photo_source:`Quelle: AGES Badegewässer-Monitoring`},quality:{excellent:`Ausgezeichnet`,good:`Gut`,sufficient:`Ausreichend`,poor:`Mangelhaft`},error:{entity_missing:`Die Entität {entity} gibt es nicht mehr. Wähle im Karteneditor eine andere aus.`,not_this_integration:`{entity} gehört nicht zu Badegewässer Austria. Wähle eine Entität dieser Integration.`,no_device:`Wähle im Karteneditor ein Badegewässer aus.`,device_missing:`Dieses Badegewässer gibt es nicht mehr. Wähle im Karteneditor ein anderes aus.`},version:{mismatch:`Diese Karte ist veraltet ({card} statt {integration}).`,reload:`Neu laden`},editor:{device:`Badegewässer`,device_helper:`Welchen See oder Fluss die Karte zeigen soll.`,name:`Titel`,name_helper:`Leer lassen, um den Namen des Badegewässers zu verwenden.`,show_photo:`Foto zeigen`,show_photo_helper:`Ein Bild der Badestelle, sofern es eines gibt.`,show_season_track:`Saisonverlauf zeigen`,show_season_track_helper:`Die Proben der Saison als Zeitachse.`,show_readings:`Messwerte zeigen`,show_readings_helper:`Wasserqualität, E. coli, Enterokokken und Sichttiefe.`}},rt={card:{season_over:`Season over`,in_season:`Bathing season under way`,no_samples:`No samples yet this season`,closed:`Swimming prohibited`,sampled_on:`Sampled {date}`,not_measured:`not measured`,season_axis_label:`Samples from the {year} season`,water_quality:`Water quality`,e_coli:`E. coli`,enterococci:`Enterococci`,secchi_depth:`Secchi depth`,water_temperature:`Water temperature`,rating_year:`{year} rating`,no_rating:`not yet rated`,below_limit:`below the detection limit`,attribution:`Data source: AGES · CC BY 3.0 AT`,photo_alt:`Bathing spot at {name}`,photo_source:`Source: AGES bathing-water monitoring`},quality:{excellent:`Excellent`,good:`Good`,sufficient:`Sufficient`,poor:`Poor`},error:{entity_missing:`The entity {entity} no longer exists. Pick another one in the card editor.`,not_this_integration:`{entity} isn't part of Badegewässer Austria. Pick an entity from this integration.`,no_device:`Pick a bathing water in the card editor.`,device_missing:`That bathing water no longer exists. Pick another one in the card editor.`},version:{mismatch:`This card is out of date ({card} instead of {integration}).`,reload:`Reload`},editor:{device:`Bathing water`,device_helper:`Which lake or river the card should show.`,name:`Title`,name_helper:`Leave empty to use the bathing water's own name.`,show_photo:`Show the photo`,show_photo_helper:`A picture of the bathing spot, where there is one.`,show_season_track:`Show the season track`,show_season_track_helper:`This season's samples on a time axis.`,show_readings:`Show the readings`,show_readings_helper:`Water quality, E. coli, enterococci and Secchi depth.`}};function H(e,t,n={}){let r=(t??W).toLowerCase().split(`-`)[0]??W,[i,a]=e.split(`.`),o=U[r]??U[W],s=U[W],c=e=>i&&a?e?.[i]?.[a]:void 0,l=c(o)??c(s)??e;return Object.entries(n).reduce((e,[t,n])=>e.replaceAll(`{${t}}`,String(n)),l)}var U,W,it=t((()=>{U={de:nt,en:rt},W=`en`}));B(),it();const at={month:5,day:15},ot={month:8,day:31},st=[5,6,7,8],ct=e=>{let t=Date.UTC(e.getUTCFullYear(),0,1),n=Date.UTC(e.getUTCFullYear(),e.getUTCMonth(),e.getUTCDate());return Math.round((n-t)/864e5)};function lt(e){let t=e.getUTCFullYear(),n=ct(new Date(Date.UTC(t,at.month-1,at.day))),r=ct(new Date(Date.UTC(t,ot.month-1,ot.day)))-n;return r<=0?0:Math.min(1,Math.max(0,(ct(e)-n)/r))}const ut=e=>{let t=/* @__PURE__ */ new Date(`${e}T00:00:00Z`);return Number.isNaN(t.getTime())?null:t},G=e=>`${(e*100).toFixed(3)}%`;function dt(e){let{samples:t,formatDate:n,formatTemperature:r,language:i}=e;return t.length===0?H(`card.no_samples`,i):t.map(e=>{let t=ut(e.date);return`${t?n(t):e.date}: ${r(e.water_temperature)}`}).join(`, `)}function ft(e){let{samples:t,now:n,language:r,formatDate:i,formatTemperature:a,hovered:o,onHover:s}=e,c=lt(n),l=t.map(e=>({sample:e,date:ut(e.date)})).filter(e=>e.date!==null).map(e=>({...e,cx:G(lt(e.date))})),u=l.length-1,d=o==null?void 0:l[o],f=l.at(-1)?.date.getUTCFullYear()??n.getUTCFullYear(),ee=e=>new Intl.DateTimeFormat(r??`en`,{month:`short`,timeZone:`UTC`}).format(new Date(Date.UTC(f,e-1,15)));return A`
    <div class="track-wrap">
      <!-- role="group", not "img". ARIA makes every descendant of an img
           presentational, so the focusable, labelled points below would take
           keyboard focus and announce nothing (axe: nested-interactive,
           WCAG 4.1.2). A group keeps the axis label AND exposes the points. -->
      <svg
        class="track"
        role="group"
        aria-label=${H(`card.season_axis_label`,r,{year:f})}
      >
        <!-- Solid hairlines only. A dashed rule reads as a threshold or a
             projection when it is just an axis. -->
        ${j`<line
          class="track-ground"
          x1=${G(0)} y1=${14} x2=${G(1)} y2=${14}
        />`}
        ${j`<line
          class="track-filled"
          x1=${G(0)} y1=${14} x2=${G(c)} y2=${14}
        />`}
        ${st.map((e,t)=>{let n=lt(new Date(Date.UTC(f,e-1,t===0?at.day:1)));return j`<text
            class="month"
            x=${G(n)}
            y=${38}
            text-anchor=${t===0?`start`:`middle`}
          >${ee(e)}</text>`})}
        ${l.map((e,t)=>j`
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
      ${d?A`<div
            class="tip"
            role="status"
            style=${`--tip-x:${d.cx}`}
          >
            <span class="tip-date">${i(d.date)}</span>
            <span class="tip-value"
              >${a(d.sample.water_temperature)}</span
            >
          </div>`:N}
    </div>
  `}const pt=l`
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
`;var mt,ht,K,q,J,Y,gt,_t,vt=t((()=>{mt=`badegewaesser_austria`,ht=/* @__PURE__ */ new Set([`unknown`,`unavailable`,``,`none`]),K=e=>e!==void 0&&!ht.has(e.state.toLowerCase()),q=e=>{if(!K(e))return null;let t=Number(e?.state);return Number.isFinite(t)?t:null},J=e=>e?.locale?.language??e?.language,Y=(e,t,n=1)=>e===null?null:new Intl.NumberFormat(t??`en`,{minimumFractionDigits:n,maximumFractionDigits:n}).format(e),gt=(e,t)=>new Intl.DateTimeFormat(t??`en`,{day:`numeric`,month:`long`,timeZone:`UTC`}).format(e),_t=(e,t,n)=>{let r=Y(e,n,0);return r===null?null:t?`<${r}`:r}}));function X(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a}var yt=t((()=>{})),bt,xt=t((()=>{bt=(e,t,n)=>{e.dispatchEvent(new CustomEvent(t,{detail:n,bubbles:!0,composed:!0}))}})),St=/* @__PURE__ */ n({BadegewaesserAustriaCardEditor:()=>Z}),Ct,Z,wt=t((()=>{B(),it(),xt(),vt(),yt(),Ct=[{name:`device`,required:!0,selector:{device:{filter:{integration:mt}}}},{name:`name`,selector:{text:{}}},{type:`grid`,name:``,flatten:!0,schema:[{name:`show_photo`,selector:{boolean:{}}},{name:`show_season_track`,selector:{boolean:{}}},{name:`show_readings`,selector:{boolean:{}}}]}],Z=class extends z{constructor(...e){super(...e),this._computeLabel=e=>H(`editor.${e.name}`,J(this.hass)),this._computeHelper=e=>{let t=`editor.${e.name}_helper`,n=H(t,J(this.hass));return n===t?void 0:n}}setConfig(e){this._config=e}render(){return!this.hass||!this._config?N:A`
      <ha-form
        .hass=${this.hass}
        .data=${Ze(this._config)}
        .schema=${Ct}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `}_valueChanged(e){bt(this,`config-changed`,{config:e.detail.value})}},X([Re({attribute:!1})],Z.prototype,`hass`,void 0),X([V()],Z.prototype,`_config`,void 0),Z=X([Ie(`badegewaesser-austria-card-editor`)],Z)}));B(),Ye(),et(),it(),vt(),yt();const Q={temperature:`water_temperature`,quality:`water_quality`,eColi:`e_coli`,enterococci:`enterococci`,secchi:`secchi_depth`,lastSample:`last_sample`,closed:`closed`,season:`bathing_season`,photo:`photo`};let $=class extends z{constructor(...e){super(...e),this._hoveredPoint=null,this._photoTip=!1,this._versionChecked=!1}static{this.styles=[Xe,pt]}static async getConfigElement(){return await Promise.resolve().then(()=>(wt(),St)),document.createElement(`badegewaesser-austria-card-editor`)}static getStubConfig(e){return{device:Object.values(e.entities??{}).find(e=>e.platform===`badegewaesser_austria`&&e.device_id)?.device_id??``}}setConfig(e){if(!e)throw Error(H(`error.no_device`,void 0));this._config=Ze(e)}getCardSize(){return 4}getGridOptions(){return{columns:12,min_columns:6,rows:`auto`}}updated(){this._checkVersion()}async _checkVersion(){if(!this._versionChecked&&this.hass?.callWS){this._versionChecked=!0;try{let e=await this.hass.callWS({type:`${mt}/card_version`});e?.version&&e.version!==`0.1.0`&&(this._staleVersion=e.version)}catch{}}}async _reload(){try{if(`caches`in window){let e=await caches.keys();await Promise.all(e.map(e=>caches.delete(e)))}}catch{}location.reload()}_siteEntities(){let e=this.hass,t=Qe(e,this._config);if(!e||!t)return;let n={};for(let r of Object.values(e.entities??{}))r.device_id===t&&r.platform===`badegewaesser_austria`&&r.translation_key&&(n[r.translation_key]=e.states[r.entity_id]);return n}_deviceName(){let e=Qe(this.hass,this._config),t=e?this.hass?.devices?.[e]:void 0;return t?.name_by_user??t?.name}render(){let e=this._config,t=this.hass;if(!e||!t)return N;let n=J(t);if(!e.device&&!e.entity)return this._renderAlert(H(`error.no_device`,n));if(!e.device&&e.entity){let r=t.entities?.[e.entity];if(!r||!t.states[e.entity])return this._renderAlert(H(`error.entity_missing`,n,{entity:e.entity}));if(r.platform!==`badegewaesser_austria`)return this._renderAlert(H(`error.not_this_integration`,n,{entity:e.entity}))}let r=this._siteEntities()??{};if(Object.keys(r).length===0)return this._renderAlert(H(`error.device_missing`,n));let i=r[Q.temperature],a=r[Q.closed],o=r[Q.season],s=e.name??this._deviceName()??``,c=i?.attributes.season_samples??[],l=o?.state===`on`,u=a?.state===`on`;return A`
      <ha-card>
        ${e.show_photo===!1?N:this._renderPhoto(r[Q.photo],s,n)}
        ${this._renderVersionBanner(n)}
        ${u?this._renderClosure(a,n):N}
        <div class="body">
          <h2 class="title">${s}</h2>
          ${this._renderPlace()}
          ${e.show_season_track===!1?N:this._renderSeason(i,c,l,n)}
          ${e.show_readings===!1?N:this._renderReadings(r,n)}
          <p class="attribution">${H(`card.attribution`,n)}</p>
        </div>
      </ha-card>
    `}_renderAlert(e){return A`
      <ha-card>
        <div class="body"><ha-alert alert-type="error">${e}</ha-alert></div>
      </ha-card>
    `}_renderVersionBanner(e){return this._staleVersion?A`
      <div class="version-banner">
        <ha-icon icon="mdi:refresh" aria-hidden="true"></ha-icon>
        <span
          >${H(`version.mismatch`,e,{card:`0.1.0`,integration:this._staleVersion})}</span
        >
        <button type="button" @click=${this._reload}>
          ${H(`version.reload`,e)}
        </button>
      </div>
    `:N}_renderClosure(e,t){let n=e?.attributes.closure_reason;return A`
      <div class="closure">
        <ha-icon icon="mdi:close-octagon" aria-hidden="true"></ha-icon>
        <span>${H(`card.closed`,t)}</span>
        ${typeof n==`string`&&n?A`<span class="closure-reason">${n}</span>`:N}
      </div>
    `}_renderPhoto(e,t,n){let r=this._photoUrl(e);if(!r||this._photoFailed===r)return N;let i=e?.attributes.attribution,a=typeof i==`string`?i:``,o=()=>{this._photoTip=!0},s=()=>{this._photoTip=!1};return A`
      <figure class="photo">
        <img
          src=${r}
          alt=${H(`card.photo_alt`,n,{name:t})}
          width="600"
          height="210"
          decoding="async"
          @error=${()=>this._onPhotoError(r)}
        />
        ${a?A`<figcaption
              class="photo-credit"
              tabindex="0"
              aria-describedby="photo-tip"
              @pointerenter=${o}
              @pointerleave=${s}
              @focus=${o}
              @blur=${s}
              @keydown=${e=>{e.key===`Escape`&&s()}}
            >
              ${a}
            </figcaption>`:N}
        ${a&&this._photoTip?A`<div class="photo-tip" id="photo-tip" role="tooltip">
              <span>${a}</span>
              <span class="photo-tip-source">${H(`card.photo_source`,n)}</span>
            </div>`:N}
      </figure>
    `}_photoUrl(e){let t=e?.attributes.entity_picture;if(e&&K(e)&&typeof t==`string`)return this._photo?.state!==e.state&&(this._photo={state:e.state,url:t}),this._photo.url}_onPhotoError(e){let t=this._siteEntities()?.[Q.photo]?.attributes.entity_picture;if(typeof t==`string`&&t!==e){this._photo=void 0,this.requestUpdate();return}this._photoFailed=e}_renderPlace(){let e=Qe(this.hass,this._config),t=e?this.hass?.devices?.[e]?.model:void 0;return t?A`<p class="place">${t}</p>`:N}_renderSeason(e,t,n,r){let i=q(e),a=Y(i,r),o=e?.attributes.unit_of_measurement,s=t.at(-1),c=s?/* @__PURE__ */ new Date(`${s.date}T00:00:00Z`):null,l={samples:t,now:/* @__PURE__ */ new Date,inSeason:n,language:r,formatDate:e=>gt(e,r),hovered:this._hoveredPoint,onHover:e=>{this._hoveredPoint=e},formatTemperature:e=>Y(e,r)===null?H(`card.not_measured`,r):`${Y(e,r)} ${typeof o==`string`?o:`°C`}`};return A`
      <div class="season">
        <div class="reading-block">
          <div class="reading">
            <span class=${a===null?`temperature is-missing`:`temperature`}>
              ${a??`—`}
            </span>
            ${a!==null&&typeof o==`string`?A`<span class="unit">${o}</span>`:N}
          </div>
          ${c?A`<p class="sampled">
                ${H(`card.sampled_on`,r,{date:gt(c,r)})}
              </p>`:N}
        </div>
        ${ft(l)}
        <p class="season-status">
          <ha-icon
            icon=${n?`mdi:swim`:`mdi:calendar-check`}
            aria-hidden="true"
          ></ha-icon>
          <span
            >${t.length===0?H(`card.no_samples`,r):H(n?`card.in_season`:`card.season_over`,r)}</span
          >
        </p>
        <p class="visually-hidden">${dt(l)}</p>
      </div>
    `}_renderReadings(e,t){let n=e[Q.quality],r=e[Q.eColi],i=e[Q.enterococci],a=e[Q.secchi],o=n?.attributes.rating_year,s=K(n)?H(`quality.${n?.state}`,t):H(`card.no_rating`,t);return A`
      <dl class="readings">
        <dt>${H(`card.water_quality`,t)}</dt>
        <dd>
          ${s}
          ${typeof o==`number`?A`<span class="qualifier"
                >${H(`card.rating_year`,t,{year:o})}</span
              >`:N}
        </dd>
        ${this._renderCount(Q.eColi,r,t)}
        ${this._renderCount(Q.enterococci,i,t)}
        <dt>${H(`card.secchi_depth`,t)}</dt>
        <dd>
          ${Y(q(a),t,2)??`—`}
          ${K(a)&&typeof a?.attributes.unit_of_measurement==`string`?A`<span class="unit">${a.attributes.unit_of_measurement}</span>`:N}
        </dd>
      </dl>
    `}_renderCount(e,t,n){let r=t?.attributes.below_detection_limit===!0,i=_t(q(t),r,n),a=t?.attributes.unit_of_measurement;return A`
      <dt>${H(`card.${e}`,n)}</dt>
      <dd>
        ${i??`—`}
        ${i!==null&&typeof a==`string`?A`<span class="unit">${a}</span>`:N}
        ${r?A`<span class="qualifier">${H(`card.below_limit`,n)}</span>`:N}
      </dd>
    `}};X([Re({attribute:!1})],$.prototype,`hass`,void 0),X([V()],$.prototype,`_config`,void 0),X([V()],$.prototype,`_staleVersion`,void 0),X([V()],$.prototype,`_hoveredPoint`,void 0),X([V()],$.prototype,`_photoTip`,void 0),X([V()],$.prototype,`_photoFailed`,void 0),$=X([Ie(tt)],$);const Tt=window;Tt.customCards=Tt.customCards??[],Tt.customCards.push({type:tt,name:`Badegewässer Austria`,description:`Wasserqualität und Temperatur eines österreichischen Badegewässers`,preview:!0,documentationURL:`https://github.com/rolandzeiner/badegewaesser-austria`,getEntitySuggestion:(e,t)=>{let n=e.entities?.[t];return n?.platform!==`badegewaesser_austria`||!n.device_id?null:{config:{type:`custom:${tt}`,device:n.device_id}}}});export{$ as BadegewaesserAustriaCard};