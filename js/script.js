let session;



async function activateXR() {
  const canvas = document.createElement("canvas");
  document.body.appendChild(canvas);
  const gl = canvas.getContext("webgl", {xrCompatible: true});

  session = await navigator.xr.requestSession("immersive-ar", {requiredFeatures: ['hit-test']});

  const scene = new THREE.Scene();

  const materials = [
    new THREE.MeshBasicMaterial({color: 0xff0000}),
    new THREE.MeshBasicMaterial({color: 0x0000ff}),
    new THREE.MeshBasicMaterial({color: 0x00ff00}),
    new THREE.MeshBasicMaterial({color: 0xff00ff}),
    new THREE.MeshBasicMaterial({color: 0x00ffff}),
    new THREE.MeshBasicMaterial({color: 0xffff00})
  ];

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
  directionalLight.position.set(10, 15, 10);
  scene.add(directionalLight);

  const cube = new THREE.Mesh(new THREE.BoxBufferGeometry(0.2, 0.2, 0.2), materials);
  cube.position.set(1, 1, 1);
  scene.add(cube);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    preserveDrawingBuffer: true,
    canvas: canvas,
    context: gl
  });
  renderer.autoClear = false;

  const camera = new THREE.PerspectiveCamera();
  camera.matrixAutoUpdate = false;

  const referenceSpace = await session.requestReferenceSpace('local');
  const viewerSpace = await session.requestReferenceSpace('viewer');
  const hitTestSource = await session.requestHitTestSource({ space: viewerSpace });

  const loader = new THREE.GLTFLoader();
  let reticle;
  loader.load("https://immersive-web.github.io/webxr-samples/media/gltf/reticle/reticle.gltf", function(gltf) {
    reticle = gltf.scene;
    reticle.visible = false;
    scene.add(reticle);
  });

  let flower;
  loader.load("https://immersive-web.github.io/webxr-samples/media/gltf/sunflower/sunflower.gltf", function(gltf) {
    flower = gltf.scene;
  });

  session.addEventListener("select", (event) => {
    if (flower) {
      const clone = flower.clone();
      clone.position.copy(reticle.position);
      scene.add(clone);
    }
  });

  session.updateRenderState({
    baseLayer: new XRWebGLLayer(session, gl)
  });

  const onXRFrame = (time, frame) => {
    session.requestAnimationFrame(onXRFrame);

    gl.bindFramebuffer(gl.FRAMEBUFFER, session.renderState.baseLayer.framebuffer);

    const pose = frame.getViewerPose(referenceSpace);
    if (pose) {
      const view = pose.views[0];
      const viewport = session.renderState.baseLayer.getViewport(view);
      renderer.setSize(viewport.width, viewport.height);

      camera.matrix.fromArray(view.transform.matrix);
      camera.projectionMatrix.fromArray(view.projectionMatrix);
      camera.updateMatrixWorld(true);

      const hitTestResults = frame.getHitTestResults(hitTestSource);
      if (hitTestResults.length > 0 && reticle) {
        const hitPose = hitTestResults[0].getPose(referenceSpace);
        reticle.visible = true;
        reticle.position.set(hitPose.transform.position.x, hitPose.transform.position.y, hitPose.transform.position.z);
        reticle.updateMatrixWorld(true);
      }

      renderer.render(scene, camera);
    }
  };

  session.requestAnimationFrame(onXRFrame);
}