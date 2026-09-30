(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,72272,e=>{"use strict";let t,i;var a=e.i(90072),n=e.i(8560),r=a,o=a;let s=new o.Box3,l=new o.Vector3;class u extends o.InstancedBufferGeometry{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry",this.setIndex([0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5]),this.setAttribute("position",new o.Float32BufferAttribute([-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],3)),this.setAttribute("uv",new o.Float32BufferAttribute([-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],2))}applyMatrix4(e){let t=this.attributes.instanceStart,i=this.attributes.instanceEnd;return void 0!==t&&(t.applyMatrix4(e),i.applyMatrix4(e),t.needsUpdate=!0),null!==this.boundingBox&&this.computeBoundingBox(),null!==this.boundingSphere&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let i=new o.InstancedInterleavedBuffer(t,6,1);return this.setAttribute("instanceStart",new o.InterleavedBufferAttribute(i,3,0)),this.setAttribute("instanceEnd",new o.InterleavedBufferAttribute(i,3,3)),this.instanceCount=this.attributes.instanceStart.count,this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let i=new o.InstancedInterleavedBuffer(t,6,1);return this.setAttribute("instanceColorStart",new o.InterleavedBufferAttribute(i,3,0)),this.setAttribute("instanceColorEnd",new o.InterleavedBufferAttribute(i,3,3)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new o.WireframeGeometry(e.geometry)),this}fromLineSegments(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){null===this.boundingBox&&(this.boundingBox=new o.Box3);let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;void 0!==e&&void 0!==t&&(this.boundingBox.setFromBufferAttribute(e),s.setFromBufferAttribute(t),this.boundingBox.union(s))}computeBoundingSphere(){null===this.boundingSphere&&(this.boundingSphere=new o.Sphere),null===this.boundingBox&&this.computeBoundingBox();let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(void 0!==e&&void 0!==t){let i=this.boundingSphere.center;this.boundingBox.getCenter(i);let a=0;for(let n=0,r=e.count;n<r;n++)l.fromBufferAttribute(e,n),a=Math.max(a,i.distanceToSquared(l)),l.fromBufferAttribute(t,n),a=Math.max(a,i.distanceToSquared(l));this.boundingSphere.radius=Math.sqrt(a),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}}var c=a;n.UniformsLib.line={worldUnits:{value:1},linewidth:{value:1},resolution:{value:new c.Vector2},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}},n.ShaderLib.line={uniforms:c.UniformsUtils.merge([n.UniformsLib.common,n.UniformsLib.fog,n.UniformsLib.line]),vertexShader:`
		#include <common>
		#include <color_pars_vertex>
		#include <fog_pars_vertex>
		#include <logdepthbuf_pars_vertex>
		#include <clipping_planes_pars_vertex>

		uniform float linewidth;
		uniform vec2 resolution;

		attribute vec3 instanceStart;
		attribute vec3 instanceEnd;

		attribute vec3 instanceColorStart;
		attribute vec3 instanceColorEnd;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#ifdef USE_DASH

			uniform float dashScale;
			attribute float instanceDistanceStart;
			attribute float instanceDistanceEnd;
			varying float vLineDistance;

		#endif

		float trimSegmentAlpha( const in vec4 start, const in vec4 end ) {

			// compute the interpolation factor needed to trim the segment so it terminates
			// between the camera plane and the near plane

			// conservative estimate of the near plane
			float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
			float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column

			// we need different nearEstimate formula for reversed and default depth buffer
			// a is positive with a reversed depth buffer so it can be used for controlling the code flow
			float nearEstimate = ( a > 0.0 ) ? ( - b / ( a + 1.0 ) ) : ( - 0.5 * b / a );

			return ( nearEstimate - start.z ) / ( end.z - start.z );

		}

		void main() {

			#ifdef USE_COLOR

				vColor.xyz = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

			#endif

			float aspect = resolution.x / resolution.y;

			// camera space
			vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
			vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

			#ifdef USE_DASH

				float lineDistanceStart = dashScale * instanceDistanceStart;
				float lineDistanceEnd = dashScale * instanceDistanceEnd;

			#endif

			#ifdef WORLD_UNITS

				worldStart = start.xyz;
				worldEnd = end.xyz;

			#else

				vUv = uv;

			#endif

			// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
			// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
			// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
			// perhaps there is a more elegant solution -- WestLangley

			bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

			if ( perspective ) {

				if ( start.z < 0.0 && end.z >= 0.0 ) {

					float alpha = trimSegmentAlpha( start, end );
					end.xyz = mix( start.xyz, end.xyz, alpha );

					#ifdef USE_DASH

						lineDistanceEnd = mix( lineDistanceStart, lineDistanceEnd, alpha );

					#endif

				} else if ( end.z < 0.0 && start.z >= 0.0 ) {

					float alpha = trimSegmentAlpha( end, start );
					start.xyz = mix( end.xyz, start.xyz, alpha );

					#ifdef USE_DASH

						lineDistanceStart = mix( lineDistanceEnd, lineDistanceStart, alpha );

					#endif

				}

			}

			#ifdef USE_DASH

				vLineDistance = ( position.y < 0.5 ) ? lineDistanceStart : lineDistanceEnd;
				vUv = uv;

			#endif

			// clip space
			vec4 clipStart = projectionMatrix * start;
			vec4 clipEnd = projectionMatrix * end;

			// ndc space
			vec3 ndcStart = clipStart.xyz / clipStart.w;
			vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

			// direction
			vec2 dir = ndcEnd.xy - ndcStart.xy;

			// account for clip-space aspect ratio
			dir.x *= aspect;
			dir = normalize( dir );

			#ifdef WORLD_UNITS

				vec3 worldDir = normalize( end.xyz - start.xyz );
				vec3 tmpFwd = normalize( mix( start.xyz, end.xyz, 0.5 ) );
				vec3 worldUp = normalize( cross( worldDir, tmpFwd ) );
				vec3 worldFwd = cross( worldDir, worldUp );
				worldPos = position.y < 0.5 ? start: end;

				// height offset
				float hw = linewidth * 0.5;
				worldPos.xyz += position.x < 0.0 ? hw * worldUp : - hw * worldUp;

				// don't extend the line if we're rendering dashes because we
				// won't be rendering the endcaps
				#ifndef USE_DASH

					// cap extension
					worldPos.xyz += position.y < 0.5 ? - hw * worldDir : hw * worldDir;

					// add width to the box
					worldPos.xyz += worldFwd * hw;

					// endcaps
					if ( position.y > 1.0 || position.y < 0.0 ) {

						worldPos.xyz -= worldFwd * 2.0 * hw;

					}

				#endif

				// project the worldpos
				vec4 clip = projectionMatrix * worldPos;

				// shift the depth of the projected points so the line
				// segments overlap neatly
				vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
				clip.z = clipPose.z * clip.w;

			#else

				vec2 offset = vec2( dir.y, - dir.x );
				// undo aspect ratio adjustment
				dir.x /= aspect;
				offset.x /= aspect;

				// sign flip
				if ( position.x < 0.0 ) offset *= - 1.0;

				// endcaps
				if ( position.y < 0.0 ) {

					offset += - dir;

				} else if ( position.y > 1.0 ) {

					offset += dir;

				}

				// adjust for linewidth
				offset *= linewidth;

				// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
				offset /= resolution.y;

				// select end
				vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

				// back to clip space
				offset *= clip.w;

				clip.xy += offset;

			#endif

			gl_Position = clip;

			vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

			#include <logdepthbuf_vertex>
			#include <clipping_planes_vertex>
			#include <fog_vertex>

		}
		`,fragmentShader:`
		uniform vec3 diffuse;
		uniform float opacity;
		uniform float linewidth;

		#ifdef USE_DASH

			uniform float dashOffset;
			uniform float dashSize;
			uniform float gapSize;

		#endif

		varying float vLineDistance;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#include <common>
		#include <color_pars_fragment>
		#include <fog_pars_fragment>
		#include <logdepthbuf_pars_fragment>
		#include <clipping_planes_pars_fragment>

		vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

			float mua;
			float mub;

			vec3 p13 = p1 - p3;
			vec3 p43 = p4 - p3;

			vec3 p21 = p2 - p1;

			float d1343 = dot( p13, p43 );
			float d4321 = dot( p43, p21 );
			float d1321 = dot( p13, p21 );
			float d4343 = dot( p43, p43 );
			float d2121 = dot( p21, p21 );

			float denom = d2121 * d4343 - d4321 * d4321;

			float numer = d1343 * d4321 - d1321 * d4343;

			mua = numer / denom;
			mua = clamp( mua, 0.0, 1.0 );
			mub = ( d1343 + d4321 * ( mua ) ) / d4343;
			mub = clamp( mub, 0.0, 1.0 );

			return vec2( mua, mub );

		}

		void main() {

			float alpha = opacity;
			vec4 diffuseColor = vec4( diffuse, alpha );

			#include <clipping_planes_fragment>

			#ifdef USE_DASH

				if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

				if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

			#endif

			#ifdef WORLD_UNITS

				// Find the closest points on the view ray and the line segment
				vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
				vec3 lineDir = worldEnd - worldStart;
				vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

				vec3 p1 = worldStart + lineDir * params.x;
				vec3 p2 = rayEnd * params.y;
				vec3 delta = p1 - p2;
				float len = length( delta );
				float norm = len / linewidth;

				#ifndef USE_DASH

					#ifdef USE_ALPHA_TO_COVERAGE

						float dnorm = fwidth( norm );
						alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

					#else

						if ( norm > 0.5 ) {

							discard;

						}

					#endif

				#endif

			#else

				#ifdef USE_ALPHA_TO_COVERAGE

					// artifacts appear on some hardware if a derivative is taken within a conditional
					float a = vUv.x;
					float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
					float len2 = a * a + b * b;
					float dlen = fwidth( len2 );

					if ( abs( vUv.y ) > 1.0 ) {

						alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

					}

				#else

					if ( abs( vUv.y ) > 1.0 ) {

						float a = vUv.x;
						float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
						float len2 = a * a + b * b;

						if ( len2 > 1.0 ) discard;

					}

				#endif

			#endif

			#include <logdepthbuf_fragment>
			#include <color_fragment>

			gl_FragColor = vec4( diffuseColor.rgb, alpha );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>
			#include <fog_fragment>
			#include <premultiplied_alpha_fragment>

		}
		`};class d extends c.ShaderMaterial{constructor(e){super({type:"LineMaterial",uniforms:c.UniformsUtils.clone(n.ShaderLib.line.uniforms),vertexShader:n.ShaderLib.line.vertexShader,fragmentShader:n.ShaderLib.line.fragmentShader,clipping:!0}),this.isLineMaterial=!0,this.setValues(e)}get color(){return this.uniforms.diffuse.value}set color(e){this.uniforms.diffuse.value=e}get worldUnits(){return"WORLD_UNITS"in this.defines}set worldUnits(e){!0===e!==this.worldUnits&&(this.needsUpdate=!0),!0===e?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}get linewidth(){return this.uniforms.linewidth.value}set linewidth(e){this.uniforms.linewidth&&(this.uniforms.linewidth.value=e)}get dashed(){return"USE_DASH"in this.defines}set dashed(e){!0===e!==this.dashed&&(this.needsUpdate=!0),!0===e?this.defines.USE_DASH="":delete this.defines.USE_DASH}get dashScale(){return this.uniforms.dashScale.value}set dashScale(e){this.uniforms.dashScale.value=e}get dashSize(){return this.uniforms.dashSize.value}set dashSize(e){this.uniforms.dashSize.value=e}get dashOffset(){return this.uniforms.dashOffset.value}set dashOffset(e){this.uniforms.dashOffset.value=e}get gapSize(){return this.uniforms.gapSize.value}set gapSize(e){this.uniforms.gapSize.value=e}get opacity(){return this.uniforms.opacity.value}set opacity(e){this.uniforms&&(this.uniforms.opacity.value=e)}get resolution(){return this.uniforms.resolution.value}set resolution(e){this.uniforms.resolution.value.copy(e)}get alphaToCoverage(){return"USE_ALPHA_TO_COVERAGE"in this.defines}set alphaToCoverage(e){this.defines&&(!0===e!==this.alphaToCoverage&&(this.needsUpdate=!0),!0===e?this.defines.USE_ALPHA_TO_COVERAGE="":delete this.defines.USE_ALPHA_TO_COVERAGE)}}let p=new r.Vector4,h=new r.Vector3,f=new r.Vector3,m=new r.Vector4,v=new r.Vector4,y=new r.Vector4,w=new r.Vector3,g=new r.Matrix4,x=new r.Line3,S=new r.Vector3,M=new r.Box3,b=new r.Sphere,A=new r.Vector4;function T(e,t,a){return A.set(0,0,-t,1).applyMatrix4(e.projectionMatrix),A.multiplyScalar(1/A.w),A.x=i/a.width,A.y=i/a.height,A.applyMatrix4(e.projectionMatrixInverse),A.multiplyScalar(1/A.w),Math.abs(Math.max(A.x,A.y))}class E extends r.Mesh{constructor(e=new u,t=new d({color:0xffffff*Math.random()})){super(e,t),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){let e=this.geometry,t=e.attributes.instanceStart,i=e.attributes.instanceEnd,a=new Float32Array(2*t.count);for(let e=0,n=0,r=t.count;e<r;e++,n+=2)h.fromBufferAttribute(t,e),f.fromBufferAttribute(i,e),a[n]=0===n?0:a[n-1],a[n+1]=a[n]+h.distanceTo(f);let n=new r.InstancedInterleavedBuffer(a,2,1);return e.setAttribute("instanceDistanceStart",new r.InterleavedBufferAttribute(n,1,0)),e.setAttribute("instanceDistanceEnd",new r.InterleavedBufferAttribute(n,1,1)),this}raycast(e,a){let n,o,s=this.material.worldUnits,l=e.camera;if(null!==l||s||console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.'),!1===s&&(0===this.material.resolution.x||0===this.material.resolution.y))return;let u=void 0!==e.params.Line2&&e.params.Line2.threshold||0;t=e.ray;let c=this.matrixWorld,d=this.geometry,p=this.material;if(i=p.linewidth+u,null===d.boundingSphere&&d.computeBoundingSphere(),b.copy(d.boundingSphere).applyMatrix4(c),s)n=.5*i;else{let e=Math.max(l.near,b.distanceToPoint(t.origin));n=T(l,e,p.resolution)}if(b.radius+=n,!1!==t.intersectsSphere(b)){if(null===d.boundingBox&&d.computeBoundingBox(),M.copy(d.boundingBox).applyMatrix4(c),s)o=.5*i;else{let e=Math.max(l.near,M.distanceToPoint(t.origin));o=T(l,e,p.resolution)}M.expandByScalar(o),!1!==t.intersectsBox(M)&&(s?function(e,a){let n=e.matrixWorld,o=e.geometry,s=o.attributes.instanceStart,l=o.attributes.instanceEnd,u=Math.min(o.instanceCount,s.count);for(let o=0;o<u;o++){x.start.fromBufferAttribute(s,o),x.end.fromBufferAttribute(l,o),x.applyMatrix4(n);let u=new r.Vector3,c=new r.Vector3;t.distanceSqToSegment(x.start,x.end,c,u),c.distanceTo(u)<.5*i&&a.push({point:c,pointOnLine:u,distance:t.origin.distanceTo(c),object:e,face:null,faceIndex:o,uv:null,uv1:null})}}(this,a):function(e,a,n){let o=a.projectionMatrix,s=e.material.resolution,l=e.matrixWorld,u=e.geometry,c=u.attributes.instanceStart,d=u.attributes.instanceEnd,p=Math.min(u.instanceCount,c.count),h=-a.near;t.at(1,y),y.w=1,y.applyMatrix4(a.matrixWorldInverse),y.applyMatrix4(o),y.multiplyScalar(1/y.w),y.x*=s.x/2,y.y*=s.y/2,y.z=0,w.copy(y),g.multiplyMatrices(a.matrixWorldInverse,l);for(let a=0;a<p;a++){if(m.fromBufferAttribute(c,a),v.fromBufferAttribute(d,a),m.w=1,v.w=1,m.applyMatrix4(g),v.applyMatrix4(g),m.z>h&&v.z>h)continue;if(m.z>h){let e=m.z-v.z,t=(m.z-h)/e;m.lerp(v,t)}else if(v.z>h){let e=v.z-m.z,t=(v.z-h)/e;v.lerp(m,t)}m.applyMatrix4(o),v.applyMatrix4(o),m.multiplyScalar(1/m.w),v.multiplyScalar(1/v.w),m.x*=s.x/2,m.y*=s.y/2,v.x*=s.x/2,v.y*=s.y/2,x.start.copy(m),x.start.z=0,x.end.copy(v),x.end.z=0;let u=x.closestPointToPointParameter(w,!0);x.at(u,S);let p=r.MathUtils.lerp(m.z,v.z,u),f=p>=-1&&p<=1,y=w.distanceTo(S)<.5*i;if(f&&y){x.start.fromBufferAttribute(c,a),x.end.fromBufferAttribute(d,a),x.start.applyMatrix4(l),x.end.applyMatrix4(l);let i=new r.Vector3,o=new r.Vector3;t.distanceSqToSegment(x.start,x.end,o,i),n.push({point:o,pointOnLine:i,distance:t.origin.distanceTo(o),object:e,face:null,faceIndex:a,uv:null,uv1:null})}}}(this,l,a))}}onBeforeRender(e){let t=this.material.uniforms;t&&t.resolution&&(e.getViewport(p),this.material.uniforms.resolution.value.set(p.z,p.w))}}class P extends u{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(e){let t=e.length-3,i=new Float32Array(2*t);for(let a=0;a<t;a+=3)i[2*a]=e[a],i[2*a+1]=e[a+1],i[2*a+2]=e[a+2],i[2*a+3]=e[a+3],i[2*a+4]=e[a+4],i[2*a+5]=e[a+5];return super.setPositions(i),this}setColors(e){let t=e.length-3,i=new Float32Array(2*t);for(let a=0;a<t;a+=3)i[2*a]=e[a],i[2*a+1]=e[a+1],i[2*a+2]=e[a+2],i[2*a+3]=e[a+3],i[2*a+4]=e[a+4],i[2*a+5]=e[a+5];return super.setColors(i),this}setFromPoints(e){let t=e.length-1,i=new Float32Array(6*t);for(let a=0;a<t;a++)i[6*a]=e[a].x,i[6*a+1]=e[a].y,i[6*a+2]=e[a].z||0,i[6*a+3]=e[a+1].x,i[6*a+4]=e[a+1].y,i[6*a+5]=e[a+1].z||0;return super.setPositions(i),this}fromLine(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}}class z extends E{constructor(e=new P,t=new d({color:0xffffff*Math.random()})){super(e,t),this.isLine2=!0,this.type="Line2"}}var U=e.i(35949);let _=[[76.77,35.66],[76.81,35.57],[76.88,35.44],[76.93,35.35],[76.98,35.25],[77,35.2],[77.05,35.11],[77.03,35.06],[77,34.99],[76.89,34.94],[76.78,34.9],[76.75,34.85],[76.7,34.79],[76.59,34.74],[76.51,34.74],[76.46,34.76],[76.17,34.67],[76.04,34.67],[75.94,34.61],[75.86,34.56],[75.71,34.5],[75.61,34.5],[75.45,34.54],[75.26,34.6],[75.19,34.64],[75.12,34.64],[74.95,34.65],[74.79,34.68],[74.59,34.72],[74.5,34.73],[74.3,34.77],[74.17,34.72],[74.06,34.68],[73.96,34.65],[73.88,34.53],[73.85,34.49],[73.81,34.42],[73.81,34.33],[73.92,34.29],[73.97,34.24],[73.94,34.14],[73.9,34.11],[73.92,34.04],[74.11,34],[74.21,34],[74.25,33.95],[74.22,33.89],[74.08,33.84],[74,33.79],[73.98,33.72],[73.98,33.67],[74.07,33.59],[74.13,33.55],[74.14,33.46],[74.12,33.38],[74.05,33.3],[73.99,33.24],[74,33.19],[74.05,33.14],[74.13,33.08],[74.22,33.02],[74.28,33.01],[74.32,32.93],[74.33,32.86],[74.31,32.81],[74.35,32.77],[74.48,32.77],[74.59,32.75],[74.66,32.76],[74.64,32.61],[74.66,32.52],[74.79,32.46],[74.99,32.46],[75.1,32.42],[75.23,32.37],[75.3,32.32],[75.33,32.28],[75.32,32.22],[75.25,32.14],[75.14,32.1],[75.07,32.09],[74.74,31.95],[74.64,31.89],[74.56,31.82],[74.53,31.77],[74.51,31.71],[74.58,31.52],[74.59,31.47],[74.53,31.26],[74.52,31.19],[74.54,31.13],[74.61,31.11],[74.63,31.03],[74.51,30.96],[74.38,30.89],[74.22,30.77],[74.01,30.52],[73.9,30.44],[73.88,30.35],[73.92,30.28],[73.93,30.22],[73.89,30.16],[73.81,30.09],[73.66,30.03],[73.47,29.97],[73.38,29.93],[73.32,29.77],[73.26,29.61],[73.23,29.55],[73.13,29.36],[72.95,29.09],[72.9,29.03],[72.63,28.9],[72.34,28.75],[72.29,28.7],[72.23,28.57],[72.18,28.42],[72.13,28.35],[71.95,28.18],[71.89,28.05],[71.87,27.96],[71.72,27.92],[71.54,27.87],[71.29,27.86],[71.18,27.83],[70.87,27.71],[70.8,27.71],[70.74,27.73],[70.69,27.77],[70.65,27.84],[70.63,27.94],[70.57,27.98],[70.49,28.02],[70.4,28.03],[70.32,27.98],[70.24,27.93],[70.19,27.89],[70.14,27.85],[70.05,27.69],[69.9,27.47],[69.72,27.31],[69.66,27.26],[69.62,27.23],[69.57,27.17],[69.54,27.12],[69.49,26.95],[69.47,26.8],[69.51,26.74],[69.6,26.7],[69.74,26.63],[69.91,26.59],[70.06,26.58],[70.11,26.55],[70.15,26.51],[70.15,26.35],[70.13,26.21],[70.08,26.07],[70.08,25.99],[70.1,25.91],[70.26,25.71],[70.33,25.69],[70.45,25.68],[70.51,25.69],[70.57,25.71],[70.65,25.67],[70.65,25.42],[70.7,25.33],[70.8,25.21],[70.88,25.06],[70.95,24.89],[71.02,24.76],[71.05,24.69],[71,24.65],[70.97,24.57],[70.98,24.52],[71.01,24.44],[71.04,24.4],[70.98,24.36],[70.93,24.36],[70.81,24.26],[70.72,24.24],[70.66,24.25],[70.58,24.28],[70.56,24.33],[70.57,24.39],[70.49,24.41],[70.29,24.36],[70.1,24.29],[70.07,24.24],[70.02,24.19],[69.93,24.17],[69.81,24.17],[69.72,24.17],[69.63,24.23],[69.56,24.27],[69.44,24.28],[69.24,24.27],[69.12,24.27],[69.05,24.29],[68.98,24.27],[68.9,24.29],[68.83,24.26],[68.8,24.31],[68.74,24.29],[68.72,23.96],[68.59,23.97],[68.49,23.97],[68.38,23.95],[68.28,23.93],[68.23,23.9],[68.17,23.86],[68.15,23.8],[68.12,23.75],[68.07,23.82],[68,23.83],[67.95,23.83],[67.86,23.9],[67.82,23.83],[67.67,23.81],[67.65,23.87],[67.65,23.92],[67.56,23.88],[67.5,23.94],[67.48,24.02],[67.43,24.06],[67.37,24.09],[67.31,24.17],[67.3,24.26],[67.29,24.37],[67.17,24.76],[67.1,24.79],[66.7,24.86],[66.68,24.93],[66.71,25.11],[66.7,25.23],[66.57,25.38],[66.53,25.48],[66.43,25.58],[66.32,25.6],[66.22,25.59],[66.16,25.55],[66.13,25.49],[66.36,25.51],[66.41,25.49],[66.47,25.45],[66.4,25.45],[66.33,25.47],[66.23,25.46],[65.88,25.42],[65.68,25.36],[65.41,25.37],[65.06,25.31],[64.78,25.31],[64.66,25.18],[64.59,25.21],[64.54,25.24],[64.15,25.33],[64.06,25.4],[63.99,25.35],[63.94,25.34],[63.72,25.39],[63.56,25.35],[63.5,25.3],[63.49,25.21],[63.29,25.23],[63.17,25.25],[63.02,25.22],[62.66,25.26],[62.57,25.25],[62.44,25.2],[62.39,25.15],[62.32,25.13],[62.25,25.2],[62.2,25.22],[62.09,25.16],[61.91,25.13],[61.74,25.14],[61.57,25.19],[61.62,25.29],[61.64,25.58],[61.67,25.69],[61.66,25.75],[61.74,25.82],[61.78,26],[61.81,26.17],[61.84,26.23],[62.09,26.32],[62.13,26.37],[62.24,26.36],[62.26,26.43],[62.31,26.49],[62.39,26.54],[62.44,26.56],[62.64,26.59],[62.75,26.64],[63.09,26.63],[63.16,26.65],[63.19,26.84],[63.24,26.86],[63.23,27],[63.24,27.08],[63.31,27.12],[63.26,27.21],[63.2,27.24],[62.92,27.22],[62.81,27.23],[62.76,27.25],[62.76,27.3],[62.76,27.36],[62.8,27.44],[62.81,27.5],[62.78,27.8],[62.74,28],[62.76,28.2],[62.75,28.25],[62.56,28.24],[62.43,28.36],[62.35,28.41],[62.13,28.48],[62.03,28.49],[61.89,28.55],[61.76,28.67],[61.62,28.79],[61.57,28.87],[61.51,29.01],[61.34,29.26],[61.34,29.33],[61.15,29.54],[61.03,29.66],[60.84,29.86],[61.22,29.75],[61.52,29.67],[62,29.53],[62.37,29.43],[62.48,29.41],[63.57,29.5],[63.97,29.43],[64.1,29.39],[64.17,29.46],[64.27,29.51],[64.39,29.54],[64.52,29.56],[64.7,29.57],[64.83,29.56],[64.92,29.55],[65.1,29.56],[65.18,29.58],[65.47,29.65],[65.67,29.7],[65.96,29.78],[66.18,29.84],[66.23,29.87],[66.29,29.92],[66.31,29.97],[66.25,30.04],[66.24,30.11],[66.28,30.19],[66.31,30.32],[66.3,30.5],[66.29,30.61],[66.35,30.8],[66.4,30.91],[66.5,30.96],[66.57,31],[66.62,31.05],[66.73,31.19],[66.83,31.26],[66.92,31.31],[67.03,31.3],[67.12,31.24],[67.29,31.22],[67.45,31.23],[67.6,31.28],[67.66,31.31],[67.74,31.34],[67.65,31.41],[67.6,31.45],[67.58,31.51],[67.63,31.54],[67.74,31.55],[68.02,31.68],[68.13,31.76],[68.16,31.8],[68.21,31.81],[68.32,31.77],[68.44,31.75],[68.52,31.79],[68.6,31.8],[68.67,31.76],[68.71,31.71],[68.78,31.65],[68.87,31.63],[68.97,31.67],[69.08,31.74],[69.19,31.84],[69.28,31.94],[69.26,32.25],[69.24,32.43],[69.29,32.53],[69.36,32.59],[69.41,32.68],[69.4,32.76],[69.45,32.83],[69.5,33.02],[69.57,33.06],[69.7,33.09],[69.92,33.11],[70.09,33.2],[70.26,33.29],[70.28,33.37],[70.22,33.45],[70.13,33.62],[70.06,33.72],[69.87,33.9],[69.89,34.01],[69.99,34.05],[70.25,33.98],[70.33,33.96],[70.42,33.95],[70.65,33.95],[70.85,33.98],[71.05,34.05],[71.09,34.12],[71.09,34.2],[71.09,34.27],[71.1,34.37],[71.02,34.43],[70.98,34.49],[71.02,34.55],[71.07,34.6],[71.11,34.68],[71.23,34.78],[71.29,34.87],[71.36,34.91],[71.46,34.97],[71.52,35.05],[71.55,35.1],[71.6,35.15],[71.61,35.21],[71.55,35.29],[71.57,35.37],[71.59,35.46],[71.57,35.55],[71.52,35.6],[71.48,35.71],[71.43,35.83],[71.4,35.88],[71.34,35.94],[71.22,36],[71.19,36.04],[71.23,36.12],[71.31,36.17],[71.46,36.29],[71.55,36.38],[71.62,36.44],[71.72,36.43],[71.77,36.43],[71.82,36.49],[71.92,36.53],[72.1,36.63],[72.16,36.7],[72.25,36.73],[72.33,36.74],[72.43,36.77],[72.53,36.8],[72.62,36.83],[72.77,36.84],[72.99,36.85],[73.12,36.87],[73.41,36.88],[73.73,36.89],[73.91,36.85],[74,36.82],[74.19,36.9],[74.43,36.98],[74.54,37.02],[74.6,37.04],[74.69,37.04],[74.77,37.01],[74.84,36.98],[74.89,36.95],[74.95,36.97],[75.05,36.99],[75.15,36.97],[75.35,36.91],[75.42,36.74],[75.57,36.76],[75.67,36.74],[75.77,36.69],[75.84,36.65],[75.88,36.6],[75.93,36.52],[75.95,36.46],[75.97,36.38],[75.97,36.17],[75.9,36.09],[75.95,36.02],[76.01,36],[76.07,35.98],[76.15,35.83],[76.25,35.81],[76.39,35.84],[76.5,35.88],[76.55,35.89],[76.56,35.77],[76.63,35.73],[76.73,35.68],[76.77,35.66]],D=Math.PI/180,B=1e3/U.EARTH_KM,V=e=>Math.min(1,Math.max(0,e)),C=(e,t,i)=>e+(t-e)*i,L=(e,t,i)=>{let a=V((i-e)/(t-e));return a*a*(3-2*a)},H=e=>e<.5?4*e*e*e:1-Math.pow(-2*e+2,3)/2;function R(e,t,i){return e+(((t-e)%360+540)%360-180)*i}function W(e,t,i=new a.Vector3){let n=(90-e)*D,r=(t+180)*D;return i.set(-Math.cos(r)*Math.sin(n),Math.cos(n),Math.sin(r)*Math.sin(n))}function F(e){let t=90-Math.acos(Math.max(-1,Math.min(1,e.y)))/D,i=Math.atan2(e.z,-e.x)/D-180;return i<-180&&(i+=360),[t,i]}function O(e,t,i,n=new a.Vector3){let r=e.angleTo(t);if(r<1e-6)return n.copy(e);let o=Math.sin(r);return n.copy(e).multiplyScalar(Math.sin((1-i)*r)/o).addScaledVector(t,Math.sin(i*r)/o).normalize()}let I=e=>({lat:U.STEPS[e].lat,lon:U.STEPS[e].lon,...U.STEPS[e].cam}),j=new a.Vector3,G=new a.Vector3,N=new a.Vector3,q=`
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vPosW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`,k=`
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform sampler2D uP0;
  uniform sampler2D uP1;
  uniform sampler2D uP2;
  uniform sampler2D uP3;
  uniform sampler2D uP4;
  uniform sampler2D uP5;
  uniform vec4 uRect[6];
  uniform float uHas[6];
  uniform float uHasTex;
  uniform float uLights;
  uniform vec3 uSunDir;
  uniform vec3 uWarm;
  uniform vec3 uCool;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;

  vec3 layer(vec3 base, sampler2D tex, vec4 r, float has) {
    vec2 q = (vUv - r.xy) / (r.zw - r.xy);
    float edge = min(min(q.x, 1.0 - q.x), min(q.y, 1.0 - q.y));
    float w = has * smoothstep(0.0, 0.08, edge);
    return mix(base, texture2D(tex, clamp(q, 0.0, 1.0)).rgb, w);
  }

  void main() {
    vec3 n = normalize(vNormalW);
    float ndl = dot(n, uSunDir);
    float day = smoothstep(-0.14, 0.22, ndl);
    vec3 dayTex = mix(vec3(0.05, 0.11, 0.2), texture2D(uDay, vUv).rgb, uHasTex);
    vec3 nightTex = texture2D(uNight, vUv).rgb * uHasTex;
    nightTex = layer(nightTex, uP0, uRect[0], uHas[0]);
    nightTex = layer(nightTex, uP1, uRect[1], uHas[1]);
    nightTex = layer(nightTex, uP2, uRect[2], uHas[2]);
    nightTex = layer(nightTex, uP3, uRect[3], uHas[3]);
    nightTex = layer(nightTex, uP4, uRect[4], uHas[4]);
    nightTex = layer(nightTex, uP5, uRect[5], uHas[5]);
    vec3 lit = dayTex * (0.04 + max(ndl, 0.0) * 1.3);
    float lights = smoothstep(0.28, 0.9, nightTex.r) * smoothstep(0.18, 0.75, nightTex.g);
    vec3 night = nightTex * 0.26 + vec3(0.004, 0.007, 0.014) + vec3(1.0, 0.7, 0.4) * pow(lights, 1.25) * uLights;
    vec3 col = mix(night, lit, day);
    vec3 v = normalize(cameraPosition - vPosW);
    float ocean = smoothstep(0.02, -0.05, dayTex.g - dayTex.b) * uHasTex;
    vec3 hv = normalize(uSunDir + v);
    col += vec3(1.0, 0.86, 0.68) * pow(max(dot(n, hv), 0.0), 70.0) * ocean * day * 0.55;
    float rim = pow(1.0 - max(dot(n, v), 0.0), 4.0);
    vec3 haze = mix(uWarm, uCool, smoothstep(0.0, 0.35, ndl));
    col = mix(col, haze * smoothstep(-0.18, 0.12, ndl), rim * 0.65);
    gl_FragColor = vec4(col, 1.0);
  }
`,K=`
  varying vec3 vPosW;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vPosW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`,$=`
  uniform vec3 uSunDir;
  uniform vec3 uWarm;
  uniform vec3 uCool;
  uniform float uR;
  uniform float uH;
  varying vec3 vPosW;
  void main() {
    vec3 rd = normalize(vPosW - cameraPosition);
    vec3 cp = cameraPosition + rd * max(-dot(cameraPosition, rd), 0.0);
    float h = max(length(cp) - uR, 0.0);
    float sunSide = dot(normalize(cp), uSunDir);
    float dens = exp(-h / uH);
    float lit = smoothstep(-0.22, 0.08, sunSide);
    float twilight = 1.0 - smoothstep(-0.02, 0.4, sunSide);
    vec3 warm = mix(uWarm, mix(uWarm, vec3(1.0, 0.86, 0.62), 0.45), smoothstep(0.0, 2.2 * uH, h));
    vec3 col = mix(uCool, warm, twilight * exp(-h / (2.6 * uH)));
    float fwd = pow(max(dot(rd, uSunDir), 0.0), 6.0);
    vec3 glow = col * dens * lit * (0.9 + fwd * 3.0);
    glow += vec3(0.3, 0.85, 0.45) * exp(-pow((h - 6.8 * uH) / (0.5 * uH), 2.0)) * (1.0 - lit) * 0.06;
    glow += uCool * 0.09 * dens * (1.0 - lit);
    gl_FragColor = vec4(glow, 1.0);
  }
`,J=`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`,X=`
  uniform sampler2D tScene;
  uniform vec2 uRes;
  uniform float uTime;
  uniform float uExposure;
  uniform vec3 uTint;
  uniform vec3 uSpace;
  varying vec2 vUv;
  vec3 aces(vec3 x) {
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
  }
  vec3 toSrgb(vec3 c) {
    vec3 lo = c * 12.92;
    vec3 hi = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
    return mix(lo, hi, step(vec3(0.0031308), c));
  }
  void main() {
    vec3 hdr = texture2D(tScene, vUv).rgb * uExposure;
    float lum = dot(hdr, vec3(0.2126, 0.7152, 0.0722));
    hdr += uSpace * (1.0 - smoothstep(0.0, 0.12, lum)) * smoothstep(0.15, 1.0, vUv.y) * 1.3;
    vec3 col = toSrgb(clamp(aces(hdr) * uTint, 0.0, 1.0));
    vec2 q = vUv - 0.5;
    col *= 1.0 - dot(q, q) * 0.5;
    vec2 px = vUv * uRes;
    float n = fract(sin(dot(px + fract(uTime) * 97.13, vec2(12.9898, 78.233))) * 43758.5453);
    col += (n - 0.5) * 0.026;
    gl_FragColor = vec4(col, 1.0);
  }
`;e.s(["createJourney",0,function(e,t){let i="high"===t.quality,r=new n.WebGLRenderer({canvas:e,antialias:!1,alpha:!1,powerPreference:"high-performance"}),o=Math.min(window.devicePixelRatio||1,i?1.6:1);r.setPixelRatio(o),r.setClearColor(329483,1);let s=e.clientWidth||window.innerWidth,l=e.clientHeight||window.innerHeight,u=new a.WebGLRenderTarget(1,1,{type:a.HalfFloatType,samples:4*!!i,depthBuffer:!0}),c=new a.Scene,p=new a.PerspectiveCamera(42,s/l,.1,8e4),h=new a.TextureLoader,f=new a.DataTexture(new Uint8Array([0,0,0,255]),1,1);f.needsUpdate=!0;let m=new a.Color,v=new a.Color,y={uDay:{value:f},uNight:{value:f},uP0:{value:f},uP1:{value:f},uP2:{value:f},uP3:{value:f},uP4:{value:f},uP5:{value:f},uRect:{value:U.PATCHES.map(({bounds:[e,t,i,n]})=>new a.Vector4((e+180)/360,(t+90)/180,(i+180)/360,(n+90)/180))},uHas:{value:U.PATCHES.map(()=>0)},uHasTex:{value:0},uLights:{value:.8},uSunDir:{value:new a.Vector3(0,0,-1)},uWarm:{value:m},uCool:{value:v}},w=[],g=e=>(e.colorSpace=a.SRGBColorSpace,e.anisotropy=Math.min(8,r.capabilities.getMaxAnisotropy()),w.push(e),e),x=0,S=e=>t=>{y[e].value=g(t),2===(x+=1)&&(y.uHasTex.value=1)},M=e=>`${t.textureBase}/${e}`;h.load(M(i?"night/world-4k.jpg":"night/world-2k.jpg"),S("uNight")),h.load(M(i?"earth-day.jpg":"earth-day-sm.jpg"),S("uDay")),[1,2,0,3,4,5].forEach((e,t)=>{let a=U.PATCHES[e];window.setTimeout(()=>h.load(M(`night/${!i&&a.small?a.small:a.file}`),t=>{y[`uP${e}`].value=g(t),y.uHas.value[e]=1}),120*t)});let b=new a.Mesh(new a.SphereGeometry(1e3,i?256:144,i?160:96),new a.ShaderMaterial({vertexShader:q,fragmentShader:k,uniforms:y}));c.add(b);let A={uSunDir:{value:new a.Vector3},uWarm:{value:m},uCool:{value:v},uR:{value:1e3},uH:{value:2.2}};c.add(new a.Mesh(new a.SphereGeometry(1025,160,110),new a.ShaderMaterial({vertexShader:K,fragmentShader:$,uniforms:A,side:a.BackSide,blending:a.AdditiveBlending,transparent:!0,depthWrite:!1})));let T=new a.PointsMaterial({size:1.7,sizeAttenuation:!1,vertexColors:!0,transparent:!0,depthTest:!1,depthWrite:!1}),E=(()=>{let e=i?3200:1600,t=new Float32Array(3*e),n=new Float32Array(3*e),r=99,o=()=>(r=16807*r%0x7fffffff)/0x7fffffff;for(let i=0;i<e;i++){let e=2*o()-1,a=o()*Math.PI*2,r=Math.sqrt(1-e*e);t.set([r*Math.cos(a)*4e4,4e4*e,r*Math.sin(a)*4e4],3*i);let s=.25+.9*Math.pow(o(),6);n.set([.92*s,.95*s,s],3*i)}let s=new a.BufferGeometry;s.setAttribute("position",new a.BufferAttribute(t,3)),s.setAttribute("color",new a.BufferAttribute(n,3));let l=new a.Points(s,T);return l.renderOrder=-10,l.frustumCulled=!1,l})();c.add(E);let Y=U.STEPS.map((e,t)=>e.pin?t:-1).filter(e=>e>=0),Z=[],Q=Y.slice(0,-1).map((e,t)=>{let i=W(U.STEPS[e].lat,U.STEPS[e].lon),n=W(U.STEPS[Y[t+1]].lat,U.STEPS[Y[t+1]].lon),r=Math.max(12,Math.min(320,Math.round(i.angleTo(n)*U.EARTH_KM/30))),o=[],s=new a.Vector3;for(let e=0;e<=r;e++)O(i,n,e/r,s).multiplyScalar(1e3+1.5*B),o.push(s.x,s.y,s.z);let l=new P;l.setPositions(o);let u=[7,2.2].map(e=>{let t=new d({color:0xff8a3d,linewidth:e,transparent:!0,opacity:0,depthWrite:!1});Z.push({mat:t,px:e});let i=new z(l,t);return i.frustumCulled=!1,c.add(i),t});return{geo:l,mats:u,segments:r,from:i,to:n,arrive:Y[t+1],progress:0,focus:0}}),ee=new P;ee.setPositions(_.flatMap(([e,t])=>W(t,e).multiplyScalar(1e3+ +B).toArray()));let et=[6,1.8].map(e=>{let t=new d({color:0xffd2a8,linewidth:e,transparent:!0,opacity:0,depthWrite:!1});Z.push({mat:t,px:e});let i=new z(ee,t);return i.frustumCulled=!1,c.add(i),t}),ei=0,ea=new a.BufferGeometry;ea.setAttribute("position",new a.BufferAttribute(new Float32Array(3),3));let en=new a.PointsMaterial({color:new a.Color(2.2,1.5,1),size:9,sizeAttenuation:!1,transparent:!0,opacity:0,depthWrite:!1}),er=new a.Points(ea,en);er.frustumCulled=!1,c.add(er);let eo=new a.Mesh(new a.SphereGeometry(260,24,16),new a.MeshBasicMaterial({color:new a.Color(6,5.2,4.2)}));c.add(eo);let es=(()=>{let e=new Uint8Array(65536);for(let t=0;t<128;t++)for(let i=0;i<128;i++){let a=Math.min(1,Math.hypot(i-64+.5,t-64+.5)/64),n=.55*Math.pow(1-a,3)+.45*Math.exp(-(16*a)),r=(128*t+i)*4;e[r]=e[r+1]=e[r+2]=255,e[r+3]=Math.round(255*V(n))}let t=new a.DataTexture(e,128,128,a.RGBAFormat);return t.needsUpdate=!0,t.magFilter=a.LinearFilter,t.minFilter=a.LinearFilter,t})(),el=new a.SpriteMaterial({map:es,color:new a.Color(1.6,1.32,1),blending:a.AdditiveBlending,transparent:!0,depthWrite:!1,opacity:0}),eu=new a.Sprite(el);eu.scale.setScalar(7e3),c.add(eu);let ec=new Float32Array(66),ed=new a.BufferGeometry;ed.setAttribute("position",new a.BufferAttribute(ec,3));let ep=new a.PointsMaterial({color:0xf3efe6,size:2.4,sizeAttenuation:!1,transparent:!0,opacity:0,depthWrite:!1}),eh=new a.Points(ed,ep);eh.frustumCulled=!1,c.add(eh);let ef={tScene:{value:u.texture},uRes:{value:new a.Vector2(1,1)},uTime:{value:0},uExposure:{value:1},uTint:{value:new a.Vector3(1,1,1)},uSpace:{value:new a.Vector3}},em=new a.Scene,ev=new a.OrthographicCamera(-1,1,1,-1,0,1),ey=new a.Mesh(new a.PlaneGeometry(2,2),new a.ShaderMaterial({vertexShader:J,fragmentShader:X,uniforms:ef,depthTest:!1,depthWrite:!1}));ey.frustumCulled=!1,em.add(ey);let ew=Y.map(e=>W(U.STEPS[e].lat,U.STEPS[e].lon)),eg=ew.map(e=>e.clone().multiplyScalar(1000.3)),ex=Y.findIndex(e=>"houston"===U.STEPS[e].id),eS=0,eM=I(0),eb=I(0),eA=U.STEPS[0].look,eT=U.STEPS[0].look,eE=performance.now(),eP=1,ez=I(0),eU=U.STEPS[0].look,e_=0,eD=0,eB=0,eV=0,eC=!0,eL=0,eH=performance.now(),eR=eH,eW=new a.Vector3,eF=new a.Vector3,eO=new a.Vector3,eI=new a.Vector3,ej=new a.Vector3,eG=new a.Vector3,eN=new a.Vector3,eq=new a.Vector3,ek=new a.Vector3,eK=new a.Vector3,e$=new a.Vector3,eJ=new a.Vector3(0,1,0),eX=new a.Vector3;function eY(e){var i,a,n;let o,d,h,f,w,g,x,S,M;eL=requestAnimationFrame(eY);let b=Math.min(.1,(e-eH)/1e3);eH=e;let P=(e-eR)/1e3;eB+=(e_-eB)*(1-Math.exp(-(3*b))),eV+=(eD-eV)*(1-Math.exp(-(3*b)));let z=V((e-eE)/1e3/eP),{key:_,hump:I}=function(e,t,i){let a=H(i);W(e.lat,e.lon,j),W(t.lat,t.lon,G);let n=Math.min(12e3,.62*(j.angleTo(G)*U.EARTH_KM)),r=Math.sin(Math.PI*i);O(j,G,a,N);let[o,s]=F(N),l=Math.min(1,n/900),u=Math.exp(C(Math.log(e.h),Math.log(t.h),a))+n*Math.pow(r,1.3),c=C(e.d,t.d,a)*(1-r*l),d=R(e.heading,t.heading,a);return l>0&&N.angleTo(G)>1e-4&&(d=R(d,function(e,t){let[i,a]=F(e),[n,r]=F(t),o=i*D,s=n*D,l=(r-a)*D;return Math.atan2(Math.sin(l)*Math.cos(s),Math.cos(o)*Math.sin(s)-Math.sin(o)*Math.cos(s)*Math.cos(l))/D}(N,G),Math.min(1,1.6*r)*l)),{key:{lat:o,lon:s,h:u,d:c,heading:d},hump:r*l}}(eM,eb,z),q=(i=eA,a=eT,n=H(z),{glow:(o=(e,t)=>[C(e[0],t[0],n),C(e[1],t[1],n),C(e[2],t[2],n)])(i.glow,a.glow),sky:o(i.sky,a.sky),space:o(i.space,a.space),tint:o(i.tint,a.tint),exposure:C(i.exposure,a.exposure,n),lights:C(i.lights,a.lights,n),stars:C(i.stars,a.stars,n),margin:C(i.margin,a.margin,n),azimuth:R(i.azimuth,a.azimuth,n)}),k=L(.85,1,z);_.heading+=2.5*Math.sin(.12*P)*k,_.h*=1+.02*Math.sin(.09*P)*k,ez=_,eU=q,m.setRGB(q.glow[0],q.glow[1],q.glow[2]),v.setRGB(q.sky[0],q.sky[1],q.sky[2]),y.uLights.value=q.lights,ef.uExposure.value=q.exposure,ef.uTint.value.set(q.tint[0],q.tint[1],q.tint[2]),ef.uSpace.value.set(q.space[0],q.space[1],q.space[2]),T.opacity=Math.min(1,.7*q.stars),T.size=1.7*(q.stars>1?1+(q.stars-1)*.35:1),el.opacity=.9*L(.5,-3,q.margin);let K=(d=(_.heading+1.5*eB)*D,W(_.lat,_.lon,eW),eO.copy(eJ).addScaledVector(eW,-eW.y).normalize(),eI.crossVectors(eO,eW).normalize(),ej.copy(eO).multiplyScalar(Math.cos(d)).addScaledVector(eI,Math.sin(d)),h=_.d*(1+.04*eV)/U.EARTH_KM,eF.copy(eW).multiplyScalar(Math.cos(h)).addScaledVector(ej,-Math.sin(h)).normalize(),p.position.copy(eF).multiplyScalar(1e3+_.h*B),f=L(.05,.45,_.d/Math.max(1,_.h)),eG.copy(ej).multiplyScalar(1-f).addScaledVector(eF,f).normalize(),p.up.copy(eG),eN.copy(eW).multiplyScalar(1e3),p.lookAt(eN),eq.copy(eN).sub(p.position),eq.addScaledVector(eF,-eq.dot(eF)),1e-6>eq.lengthSq()&&eq.copy(ej),eq.normalize().applyAxisAngle(eF,-q.azimuth*D),g=-Math.acos(1e3/(1e3+(w=p.position.length()-1e3)))-(q.margin-9*I)*D,ek.copy(eq).multiplyScalar(Math.cos(g)).addScaledVector(eF,Math.sin(g)).normalize(),y.uSunDir.value.copy(ek),A.uSunDir.value.copy(ek),eo.position.copy(ek).multiplyScalar(3e4).add(p.position),eu.position.copy(ek).multiplyScalar(29e3).add(p.position),p.near=Math.max(.05,.05*w),E.position.copy(p.position),w/B);p.updateProjectionMatrix(),x=!1,Q.forEach(e=>{let t=+(eS>=e.arrive),i=b/Math.max(.5,.9*eP);if(e.progress=t>e.progress?Math.min(t,e.progress+i):Math.max(t,e.progress-2*i),e.geo.instanceCount=Math.floor(H(e.progress)*e.segments),e.focus+=((e.arrive===eS)-e.focus)*(1-Math.exp(-(4*b))),e.mats[0].opacity=C(.05,.18,e.focus),e.mats[1].opacity=C(.28,.95,e.focus),!x&&e.progress>.002&&e.progress<.998){O(e.from,e.to,H(e.progress),e$).multiplyScalar(1e3+1.5*B);let t=ea.attributes.position;t.setXYZ(0,e$.x,e$.y,e$.z),t.needsUpdate=!0,x=!0}}),en.opacity=+!!x,ei+=((eS<=1)-ei)*(1-Math.exp(-(3*b))),et[0].opacity=.2*ei,et[1].opacity=.9*ei,function(e,t){if(ep.opacity=.85*t,t<=0)return;eK.crossVectors(eq,eF).normalize();let i=e$.copy(eq).multiplyScalar(Math.cos(25*D)).addScaledVector(eK,Math.sin(25*D)).normalize(),a=1e3+550*B,n=.13+.004*e%.1;for(let e=0;e<22;e++){let t=n-.0045*e;ec[3*e]=(eF.x*Math.cos(t)+i.x*Math.sin(t))*a,ec[3*e+1]=(eF.y*Math.cos(t)+i.y*Math.sin(t))*a,ec[3*e+2]=(eF.z*Math.cos(t)+i.z*Math.sin(t))*a}ed.attributes.position.needsUpdate=!0}(P,"orbit"===U.STEPS[eS].id?L(.4,1,z):0),r.setRenderTarget(u),r.render(c,p),ef.uTime.value=P,r.setRenderTarget(null),r.render(em,ev),t.onFrame?.({pins:(S="title"===U.STEPS[eS].id?0:Y.indexOf(eS),M=eS>Y[Y.length-1],Y.map((e,t)=>{let i="hidden";M?i=t===ex?"current":"visited":t===S?i="current":e<eS&&(i="visited");let a=eg[t],n=e$.copy(p.position).sub(a).normalize().dot(ew[t])>.01;eX.copy(a).project(p);let r=n&&eX.z<1&&1.05>Math.abs(eX.x)&&1.05>Math.abs(eX.y);return{x:(.5*eX.x+.5)*s,y:(-(.5*eX.y)+.5)*l,visible:r,state:i}})),lat:_.lat,lon:_.lon,altitudeKm:K})}function eZ(e,t){s=Math.max(1,e),l=Math.max(1,t),r.setSize(s,l,!1);let i=Math.floor(s*o),a=Math.floor(l*o);if(u.setSize(i,a),ef.uRes.value.set(i,a),s/l<.8){let e=1.24*l;p.fov=2*Math.atan(e/l*Math.tan(29*D))/D,p.aspect=s/e,p.setViewOffset(s,e,0,0,s,l)}else{let e=1.24*s;p.fov=42,p.aspect=e/l,p.setViewOffset(e,l,0,0,s,l)}p.updateProjectionMatrix(),Z.forEach(({mat:e,px:t})=>{e.resolution.set(i,a),e.linewidth=t*o})}return eZ(s,l),eL=requestAnimationFrame(eY),{goTo(e){let t=Math.max(0,Math.min(U.STEPS.length-1,e));if(t!==eS){var i,a;eM={...ez},eA=eU,eb=I(t),eT=U.STEPS[t].look,i=eM,a=eb,eP=Math.min(1.7,.85+Math.min(.75,W(i.lat,i.lon,j).angleTo(W(a.lat,a.lon,G))*U.EARTH_KM/12e3)+Math.min(.4,.1*Math.abs(Math.log(a.h/i.h)))),eE=performance.now(),eS=t}},setPointer(e,t){e_=Math.max(-1,Math.min(1,e)),eD=Math.max(-1,Math.min(1,t))},resize:eZ,setActive(e){e!==eC&&((eC=e)?(eH=performance.now(),eL=requestAnimationFrame(eY)):cancelAnimationFrame(eL))},dispose(){cancelAnimationFrame(eL),eC=!1,u.dispose(),es.dispose(),w.forEach(e=>e.dispose()),Q.forEach(e=>e.geo.dispose()),ee.dispose(),[c,em].forEach(e=>e.traverse(e=>{e.geometry?.dispose?.();let t=e.material;Array.isArray(t)?t.forEach(e=>e.dispose()):t?.dispose?.()})),r.dispose()}}}],72272)}]);