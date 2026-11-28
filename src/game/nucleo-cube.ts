import {
  BufferGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  QuadraticBezierCurve3,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  type Material,
} from "three";

/**
 * Núcleo tipo GAN 356 RS (Wing-shape Core).
 *
 * Hueco medido sobre la geometría actual (SPACING 1.03, cara a 0.47,
 * cuerpo extruido 0.65 hacia adentro):
 * - Tapa exterior del plástico ≈ radio 1.53
 * - Cara interna de los centros ≈ radio 0.80
 * - Aristas, por el lado que mira al centro ≈ radio 0.98
 * - Esquinas, por el vértice interno ≈ radio 1.13
 *
 * La esfera queda dentro de ese hueco. Los 6 brazos salen solo por los
 * ejes y terminan en un casquillo, a ras de la cáscara de cada centro.
 * Las aristas y las esquinas no se enganchan al núcleo: orbitan alrededor.
 */

/** Debe coincidir con `SPACING` en engine.ts. */
export const CUBE_SPACING = 1.03;

/** Debe coincidir con `SIZE / 2` de gan-skin (SIZE = 0.94). */
export const FACE_OFFSET = 0.47;

/**
 * Radio de la cáscara esférica que moldea el interior de las piezas.
 * Por encima de la cara interna de centros (0.80) y aristas (0.98),
 * y por debajo de la tapa exterior (~1.53).
 */
export const SHELL_RADIUS = 1.26;

/** A partir de este z local la tapa y el bisel exterior no se tocan. */
export const EXTERIOR_Z = -0.05;

/**
 * La cáscara no se acerca más que esto a la tapa, para no adelgazar
 * el plástico que se ve por fuera.
 */
export const MIN_INNER_Z = -0.3;

const CORE_RADIUS = 0.74;

export type NucleoBuild = {
  group: Group;
  geometries: BufferGeometry[];
  materials: Material[];
};

const AXIS_DIRS = [
  new Vector3(1, 0, 0),
  new Vector3(-1, 0, 0),
  new Vector3(0, 1, 0),
  new Vector3(0, -1, 0),
  new Vector3(0, 0, 1),
  new Vector3(0, 0, -1),
];

const UP = new Vector3(0, 1, 0);

export function createNucleoCore(): NucleoBuild {
  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const group = new Group();
  group.name = "nucleo-gan";
  group.userData.isNucleo = true;

  const glass = new MeshPhysicalMaterial({
    color: "#d7ecff",
    roughness: 0.06,
    metalness: 0,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    emissive: "#8ec8ff",
    emissiveIntensity: 0.18,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  });
  const crossMat = new MeshPhysicalMaterial({
    color: "#f4f8fb",
    roughness: 0.18,
    metalness: 0.04,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
  });
  const wingMat = new MeshPhysicalMaterial({
    color: "#3ec4ff",
    emissive: "#1478ff",
    emissiveIntensity: 0.85,
    roughness: 0.22,
    metalness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
  });
  const armMat = new MeshPhysicalMaterial({
    color: "#e7f3fb",
    roughness: 0.12,
    metalness: 0.08,
    transparent: true,
    opacity: 0.72,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  });
  const sleeveMat = new MeshPhysicalMaterial({
    color: "#d5dde6",
    roughness: 0.28,
    metalness: 0.55,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
  });
  materials.push(glass, crossMat, wingMat, armMat, sleeveMat);

  const sphereGeo = new SphereGeometry(CORE_RADIUS, 48, 32);
  geometries.push(sphereGeo);
  const sphere = new Mesh(sphereGeo, glass);
  sphere.name = "nucleo-esfera";
  sphere.renderOrder = 2;
  group.add(sphere);

  const hubGeo = new SphereGeometry(0.09, 20, 14);
  geometries.push(hubGeo);
  group.add(new Mesh(hubGeo, crossMat));

  const barGeo = new CylinderGeometry(0.038, 0.038, CORE_RADIUS * 1.55, 16);
  geometries.push(barGeo);
  for (const dir of [AXIS_DIRS[0]!, AXIS_DIRS[2]!, AXIS_DIRS[4]!]) {
    const bar = new Mesh(barGeo, crossMat);
    bar.quaternion.setFromUnitVectors(UP, dir);
    group.add(bar);
  }

  const ringGeo = new TorusGeometry(0.6, 0.008, 8, 48);
  geometries.push(ringGeo);
  const ringPlanes = [
    new Quaternion(),
    new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2),
    new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2),
  ];
  for (const plane of ringPlanes) {
    const ring = new Mesh(ringGeo, crossMat);
    ring.quaternion.copy(plane);
    group.add(ring);
  }

  const wingGeo = new TubeGeometry(
    new QuadraticBezierCurve3(
      new Vector3(0.15, 0.04, 0),
      new Vector3(0.46, 0.34, 0.06),
      new Vector3(0.06, 0.62, 0),
    ),
    14,
    0.016,
    6,
    false,
  );
  geometries.push(wingGeo);
  const wingNormal = new Vector3(0, 0, 1);
  for (const plane of ringPlanes) {
    for (let i = 0; i < 4; i++) {
      const wing = new Mesh(wingGeo, wingMat);
      const spin = new Quaternion().setFromAxisAngle(wingNormal, (i * Math.PI) / 2);
      wing.quaternion.copy(plane).multiply(spin);
      group.add(wing);
    }
  }

  const shaftLen = 1.02 - 0.66;
  const shaftGeo = new CylinderGeometry(0.108, 0.078, shaftLen, 20);
  const sleeveLen = 1.16 - 1.0;
  const sleeveGeo = new CylinderGeometry(0.15, 0.15, sleeveLen, 24);
  const flangeGeo = new CylinderGeometry(0.2, 0.2, 0.04, 24);
  const noseGeo = new CylinderGeometry(0.09, 0.11, 0.06, 16);
  geometries.push(shaftGeo, sleeveGeo, flangeGeo, noseGeo);

  for (const dir of AXIS_DIRS) {
    const arm = new Group();
    arm.name = "nucleo-brazo";

    const shaft = new Mesh(shaftGeo, armMat);
    placeOnAxis(shaft, dir, 0.66 + shaftLen / 2);
    arm.add(shaft);

    const flange = new Mesh(flangeGeo, sleeveMat);
    placeOnAxis(flange, dir, 1.0);
    arm.add(flange);

    const sleeve = new Mesh(sleeveGeo, sleeveMat);
    placeOnAxis(sleeve, dir, 1.0 + sleeveLen / 2);
    arm.add(sleeve);

    const nose = new Mesh(noseGeo, armMat);
    placeOnAxis(nose, dir, 1.15);
    arm.add(nose);

    group.add(arm);
  }

  return { group, geometries, materials };
}

function placeOnAxis(mesh: Mesh, dir: Vector3, distance: number) {
  mesh.position.copy(dir).multiplyScalar(distance);
  mesh.quaternion.setFromUnitVectors(UP, dir);
}
