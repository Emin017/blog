(window.webpackJsonp=window.webpackJsonp||[]).push([[15,25,36],{248:function(t,e,i){},249:function(t,e,i){"use strict";i.r(e);var s=i(11),n={props:{item:{required:!0}},computed:{link(){return Object(s.c)(this.item.link)},exact(){return this.$site.locales?Object.keys(this.$site.locales).some(t=>t===this.link):"/"===this.link}},methods:{isExternal:s.g,isMailto:s.h,isTel:s.i,focusoutAction(){this.$emit("focusout")}}},o=i(7),l=Object(o.a)(n,(function(){var t=this,e=t._self._c;return t.isExternal(t.link)?e("a",{staticClass:"nav-link external",attrs:{href:t.link,target:t.isMailto(t.link)||t.isTel(t.link)?null:"_blank",rel:t.isMailto(t.link)||t.isTel(t.link)?null:"noopener noreferrer"},on:{focusout:t.focusoutAction}},[t._v("\n  "+t._s(t.item.text)+"\n  "),e("OutboundLink")],1):e("router-link",{staticClass:"nav-link",attrs:{to:t.link,exact:t.exact},nativeOn:{focusout:function(e){return t.focusoutAction.apply(null,arguments)}}},[t._v(t._s(t.item.text))])}),[],!1,null,null,null);e.default=l.exports},250:function(t,e,i){},251:function(t,e,i){"use strict";i.r(e);var s={name:"DropdownTransition",methods:{setHeight(t){t.style.height=t.scrollHeight+"px"},unsetHeight(t){t.style.height=""}}},n=(i(252),i(7)),o=Object(n.a)(s,(function(){return(0,this._self._c)("transition",{attrs:{name:"dropdown"},on:{enter:this.setHeight,"after-enter":this.unsetHeight,"before-leave":this.setHeight}},[this._t("default")],2)}),[],!1,null,null,null);e.default=o.exports},252:function(t,e,i){"use strict";i(248)},258:function(t,e,i){"use strict";i(250)},266:function(t,e,i){"use strict";i.r(e);var s=i(249),n=i(251),o=i(95),l=i.n(o),r={components:{NavLink:s.default,DropdownTransition:n.default},data:()=>({open:!1,isMQMobile:!1}),props:{item:{required:!0}},computed:{dropdownAriaLabel(){return this.item.ariaLabel||this.item.text}},beforeMount(){this.isMQMobile=window.innerWidth<720,window.addEventListener("resize",()=>{this.isMQMobile=window.innerWidth<720})},methods:{toggle(){this.isMQMobile&&(this.open=!this.open)},isLastItemOfArray:(t,e)=>l()(e)===t},watch:{$route(){this.open=!1}}},a=(i(258),i(7)),u=Object(a.a)(r,(function(){var t=this,e=t._self._c;return e("div",{staticClass:"dropdown-wrapper",class:{open:t.open}},[e("button",{staticClass:"dropdown-title",attrs:{type:"button","aria-label":t.dropdownAriaLabel},on:{click:t.toggle}},[t.item.link?e("router-link",{staticClass:"link-title",attrs:{to:t.item.link}},[t._v(t._s(t.item.text))]):t._e(),t._v(" "),e("span",{directives:[{name:"show",rawName:"v-show",value:!t.item.link,expression:"!item.link"}],staticClass:"title"},[t._v(t._s(t.item.text))]),t._v(" "),e("span",{staticClass:"arrow",class:t.open?"down":"right"})],1),t._v(" "),e("DropdownTransition",[e("ul",{directives:[{name:"show",rawName:"v-show",value:t.open,expression:"open"}],staticClass:"nav-dropdown"},t._l(t.item.items,(function(i,s){return e("li",{key:i.link||s,staticClass:"dropdown-item"},["links"===i.type?e("h4",[t._v(t._s(i.text))]):t._e(),t._v(" "),"links"===i.type?e("ul",{staticClass:"dropdown-subitem-wrapper"},t._l(i.items,(function(s){return e("li",{key:s.link,staticClass:"dropdown-subitem"},[e("NavLink",{attrs:{item:s},on:{focusout:function(e){t.isLastItemOfArray(s,i.items)&&t.isLastItemOfArray(i,t.item.items)&&t.toggle()}}})],1)})),0):e("NavLink",{attrs:{item:i},on:{focusout:function(e){t.isLastItemOfArray(i,t.item.items)&&t.toggle()}}})],1)})),0)])],1)}),[],!1,null,null,null);e.default=u.exports}}]);