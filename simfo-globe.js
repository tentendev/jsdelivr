/**
 *
 * @param {url} param
 */
function FsGlobe() {
    const mainContainer = document.querySelector(
        "[fs-3dglobe-element='container']"
    );

    const bgTexture = mainContainer.getAttribute("fs-3dglobe-img");

    const defaultValue = {
        url: bgTexture || "https://cdn.finsweet.com/files/globe/earthmap1k.jpg",
    };

    const globeContainer = document.createElement("div");
    globeContainer.className = "fs-3dglobe-container";

    mainContainer.appendChild(globeContainer);

    const canvas = document.createElement("canvas");

    canvas.className = "canvas-3dglobe-container";
    globeContainer.appendChild(canvas);

    const userInfo = [].slice.call(
        document.querySelectorAll("[fs-3dglobe-element='tooltip']")
    );

    const marker = [].slice.call(
        document.querySelectorAll("[fs-3dglobe-element='pin']")
    );
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });

    const fov = 60;
    const aspect = 2; // the canvas default
    const near = 0.1;
    const far = 10;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.z = 2.5;

    const controls = new THREE.OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 1.2;
    controls.maxDistance = 4;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.2;
    // //  controls.enableDamping = true;
    //   controls.campingFactor = 0.25;
    controls.enableZoom = false;
    controls.update();

    const scene = new THREE.Scene();
    // scene.background = new THREE.Color("#246");
    renderer.setClearColor(0x000000, 0);

    let renderRequested = false;
    let animationFrame;

    const team = fetchDataFromCollection(
        "[fs-3dglobe-element='list'] .w-dyn-item"
    );

    const loader = new THREE.TextureLoader();
    const texture = loader.load(defaultValue.url, render);
    texture.needsUpdate = true;

    const geometry = new THREE.SphereBufferGeometry(1, 64, 32);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    material.map.needsUpdate = true;

    function loadCountryData() {
        const lonFudge = Math.PI * 1.5;
        const latFudge = Math.PI;
        // these helpers will make it easy to position the boxes
        // We can rotate the lon helper on its Y axis to the longitude
        const lonHelper = new THREE.Object3D();
        // We rotate the latHelper on its X axis to the latitude
        const latHelper = new THREE.Object3D();
        lonHelper.add(latHelper);
        // The position helper moves the object to the edge of the sphere
        const positionHelper = new THREE.Object3D();
        positionHelper.position.z = 1;
        latHelper.add(positionHelper);

        const labelParentElem = document.createElement("div");
        labelParentElem.className = "fs-3dglobe-labels";
        globeContainer.appendChild(labelParentElem);

        for (const [index, companyInfo] of team.entries()) {
            const { lat, lon, name, url } = companyInfo;

            // adjust the helpers to point to the latitude and longitude
            lonHelper.rotation.y = THREE.MathUtils.degToRad(lon) + lonFudge;
            latHelper.rotation.x = THREE.MathUtils.degToRad(lat) + latFudge;

            // get the position of the lat/lon
            positionHelper.updateWorldMatrix(true, false);
            const position = new THREE.Vector3();
            positionHelper.getWorldPosition(position);
            companyInfo.position = position;

            // add an element for each country
            const elem = document.createElement("div");

            const infoBox = document.createElement("div");

            elem.className = "map-container";
            infoBox.innerHTML =
                userInfo[index].outerHTML ||
                getInfoBox({
                    url,
                    name,
                });

            infoBox.className = "fs-3dglobe-info-box";

            elem.style.cursor = "pointer";

            const pin = document.createElement("div");
            pin.className = "fs-3dglobe-arrow-box";

            if (!marker[index]) {
                const box = document.createElement("div");
                box.className = "fs-3dglobe-arrow_box";
                const logo = document.createElement("img");
                logo.className = "logo_dot";
                logo.position = "relative";
                logo.setAttribute("alt", name);
                logo.setAttribute("src", url);
                logo.style.cursor = "pointer";
                logo.style.width = "50px";
                box.appendChild(logo);
                pin.appendChild(box);
            } else {
                pin.appendChild(marker[index]);
            }

            elem.appendChild(pin);

            elem.appendChild(infoBox);
            labelParentElem.appendChild(elem);
            companyInfo.elem = elem;
        }
        requestRenderIfNotRequested();
    }
    loadCountryData();

    const tempV = new THREE.Vector3();
    const cameraToPoint = new THREE.Vector3();
    const cameraPosition = new THREE.Vector3();
    const normalMatrix = new THREE.Matrix3();

    const settings = {
        minArea: 20,
        maxVisibleDot: -0.08,
    };

    function updateLabels() {
        const large = settings.minArea * settings.minArea;
        // get a matrix that represents a relative orientation of the camera
        normalMatrix.getNormalMatrix(camera.matrixWorldInverse);
        // get the camera's position
        camera.getWorldPosition(cameraPosition);
        for (const companyInfo of team) {
            const { position, elem, area } = companyInfo;
            // large enough?
            if (area < large) {
                elem.style.opacity = ".009";
                elem.style.display = "none";

                continue;
            }

            // Orient the position based on the camera's orientation.
            // Since the sphere is at the origin and the sphere is a unit sphere
            // this gives us a camera relative direction vector for the position.
            tempV.copy(position);
            tempV.applyMatrix3(normalMatrix);

            // compute the direction to this position from the camera
            cameraToPoint.copy(position);
            cameraToPoint.applyMatrix4(camera.matrixWorldInverse).normalize();

            // get the dot product of camera relative direction to this position
            // on the globe with the direction from the camera to that point.
            // -1 = facing directly towards the camera
            // 0 = exactly on tangent of the sphere from the camera
            // > 0 = facing away
            const dot = tempV.dot(cameraToPoint);

            // if the orientation is not facing us hide it.
            if (dot > settings.maxVisibleDot) {
                elem.style.opacity = ".009";
                elem.style.display = "none";
                continue;
            }

            // restore the element to its default display style
            elem.style.opacity = "1";
            elem.style.display = "";

            // get the normalized screen coordinate of that position
            // x and y will be in the -1 to +1 range with x = -1 being
            // on the left and y = -1 being on the bottom
            tempV.copy(position);
            tempV.project(camera);

            // convert the normalized position to CSS coordinates
            const x = (tempV.x * 0.5 + 0.5) * canvas.clientWidth;
            const y = (tempV.y * -0.5 + 0.5) * canvas.clientHeight;

            // move the elem to that position
            elem.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;

            //   // set the zIndex for sorting
            elem.style.zIndex = ((-tempV.z * 0.5 + 0.5) * 100000) | 0;
        }
    }

    function resizeRendererToDisplaySize(renderer) {
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
            renderer.setSize(width, height, false);
        }
        return needResize;
    }

    var isPlaying = true;

    function render() {
        if (!isPlaying) {
            return;
        }

        renderRequested = undefined;

        animationFrame = requestAnimationFrame(render);

        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }

        controls.update();

        updateLabels();

        renderer.render(scene, camera);
    }
    render();

    function requestRenderIfNotRequested() {
        if (!renderRequested) {
            cancelAnimationFrame(animationFrame);
            renderRequested = true;
            animationFrame = requestAnimationFrame(render);
        }
    }

    const mapPinContainers = document.getElementsByClassName("map-container");

    for (var i = 0; i < mapPinContainers.length; i++) {
        mapPinContainers[i].addEventListener("mouseenter", () => {
            isPlaying = false;
        });

        mapPinContainers[i].addEventListener("mouseleave", () => {
            isPlaying = true;
            renderRequested = false;
            requestRenderIfNotRequested();
        });
    }

    // USED TO PASS PAGE SCROLL AS PERCENTAGE
    var getScrollPercent = function () {
        var h = document.documentElement,
            b = document.body,
            st = "scrollTop",
            sh = "scrollHeight";
        return ((h[st] || b[st]) / ((h[sh] || b[sh]) - h.clientHeight)) * 100;
    };

    // window.addEventListener("scroll", updateCamera);

    // canvas.addEventListener("mousemove", onMousemove, false);
    controls.addEventListener("change", requestRenderIfNotRequested);
    window.addEventListener("resize", requestRenderIfNotRequested);
}

function getInfoBox({ url, name, location = "N/A", role = "N/A" }) {
    return `

  <div style=" border: 1px solid #dadce0; border-radius: 8px; overflow: hidden;">
    <div class="caption">
      <img src="${url}" style="height: 200px; max-width:600px;" />
    </div>
    <div style="padding:5px 10px">
      <div>
        <strong>${name}</strong>
      </div>
      <div>Javascript, Node.js</div>
      <div>${location}</div>
    </div>
  </div>
 `;
}

function fetchDataFromCollection(collectionWrapper) {
    const collection = [].slice.call(
        document.querySelectorAll(collectionWrapper)
    );

    // const data = [].slice.call(collection.getElementsByTagName("embed"));

    // return data.map((elem) => {
    //   return {
    //     name: elem.getAttribute("name"),
    //     lat: elem.getAttribute("lat"),
    //     lon: elem.getAttribute("lon"),
    //     url: elem.getAttribute("url"),
    //     hovertext: elem.getAttribute("hovertext"),
    //   };
    // });

    return collection.map((elem) => {
        return {
            name: (elem.querySelector("[fs-3dglobe-element='name'") || {})
                .textContent,
            lat: (elem.querySelector("[fs-3dglobe-element='lat'") || {})
                .textContent,
            lon: (elem.querySelector("[fs-3dglobe-element='lon'") || {})
                .textContent,
            url: (elem.querySelector("[fs-3dglobe-element='url'") || {})
                .textContent,
        };
    });
}

function LoadSvg(url, scene) {
    const loader = new THREE.SVGLoader();

    loader.load(
        url,
        function (data) {
            let paths = data.paths;
            let group = new THREE.Group();
            group.scale.multiplyScalar(0.011);
            group.position.x = -9;
            group.rotation.x = Math.PI;
            group.position.y = 5;
            group.position.z = -3;

            for (let i = 0; i < paths.length; i++) {
                let path = paths[i];

                let material = new THREE.MeshBasicMaterial({
                    color: path.color,
                    side: THREE.DoubleSide,
                    depthWrite: false,
                });

                let shapes = path.toShapes(true);

                for (let j = 0; j < shapes.length; j++) {
                    let shape = shapes[j];
                    let geometry = new THREE.ShapeBufferGeometry(shape);
                    let mesh = new THREE.Mesh(geometry, material);
                    group.add(mesh);
                }
            }

            scene.add(group);
        },

        function (xhr) {
            console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
        },

        function (error) {
            console.log("An error happened");
        }
    );
}

(function () {
    FsGlobe();
})();
