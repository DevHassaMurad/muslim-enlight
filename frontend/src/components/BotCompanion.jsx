import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/** A small brass companion, built from geometry rather than a downloaded model. */
export default function BotCompanion({ thinking = false }) {
    const container = useRef(null);
    const thinkingRef = useRef(thinking);
    const [available, setAvailable] = useState(true);

    useEffect(() => {
        thinkingRef.current = thinking;
    }, [thinking]);

    useEffect(() => {
        const host = container.current;
        let renderer;
        try {
            renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        } catch {
            setAvailable(false);
            return;
        }

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(180, 150);
        host.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(36, 180 / 150, 0.1, 100);
        camera.position.set(0, 0.35, 5.8);
        camera.lookAt(0, 0.1, 0);
        scene.add(new THREE.HemisphereLight(0xfff0cc, 0x524d39, 3));
        const lamp = new THREE.DirectionalLight(0xffe2a0, 5);
        lamp.position.set(-3, 4, 5);
        scene.add(lamp);

        const brass = new THREE.MeshStandardMaterial({
            color: 0xb38b4a,
            metalness: 0.7,
            roughness: 0.36,
        });
        const cream = new THREE.MeshStandardMaterial({ color: 0xe5dbc0, roughness: 0.7 });
        const ink = new THREE.MeshStandardMaterial({ color: 0x293f39, roughness: 0.45 });
        const glow = new THREE.MeshStandardMaterial({
            color: 0xf9d48b,
            emissive: 0xba8c3b,
            emissiveIntensity: 0.7,
        });
        const robot = new THREE.Group();
        scene.add(robot);

        function add(geometry, material, position) {
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(...position);
            robot.add(mesh);
            return mesh;
        }

        const head = add(new THREE.SphereGeometry(0.58, 32, 24), cream, [0, 0.4, 0]);
        head.scale.set(1.1, 0.88, 0.85);
        const face = add(new THREE.SphereGeometry(0.44, 32, 16), ink, [0, 0.42, 0.35]);
        face.scale.set(1.12, 0.65, 0.45);
        const eyes = [-0.18, 0.18].map((x) =>
            add(new THREE.SphereGeometry(0.065, 16, 12), glow, [x, 0.45, 0.55])
        );
        add(new THREE.CylinderGeometry(0.31, 0.4, 0.5, 32), brass, [0, -0.3, 0]);
        add(new THREE.TorusGeometry(0.36, 0.045, 12, 40), brass, [0, 0.42, 0.44]).scale.set(
            1.45,
            0.84,
            1
        );
        add(new THREE.CylinderGeometry(0.025, 0.025, 0.25), brass, [0, 1.02, 0]);
        const antenna = add(new THREE.SphereGeometry(0.08, 16, 12), glow, [0, 1.17, 0]);
        const arms = [-1, 1].map((side) => {
            const arm = add(new THREE.CapsuleGeometry(0.09, 0.28, 4, 12), brass, [
                side * 0.49,
                -0.25,
                0,
            ]);
            arm.rotation.z = side * 0.45;
            return arm;
        });

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        function render(time = 0) {
            const seconds = time / 1000;
            const active = thinkingRef.current;
            if (!reducedMotion.matches) {
                robot.position.y = Math.sin(seconds * (active ? 3 : 1.4)) * 0.065;
                robot.rotation.y = Math.sin(seconds * 0.7) * 0.18;
                robot.rotation.z = Math.sin(seconds * 1.1) * 0.035;
                const blink = Math.sin(seconds * 0.8) > 0.995 ? 0.12 : 1;
                eyes.forEach((eye) => {
                    eye.scale.y = blink;
                });
                arms[1].rotation.z = -0.45 + (active ? Math.sin(seconds * 4) * 0.25 : 0);
                antenna.scale.setScalar(active ? 1 + Math.sin(seconds * 5) * 0.18 : 1);
            }
            glow.emissiveIntensity = active ? 1.4 : 0.7;
            renderer.render(scene, camera);
        }
        renderer.setAnimationLoop(render);

        return () => {
            renderer.setAnimationLoop(null);
            scene.traverse((object) => object.geometry?.dispose());
            [brass, cream, ink, glow].forEach((material) => material.dispose());
            renderer.dispose();
            renderer.domElement.remove();
        };
    }, []);

    return (
        <div className={`bot-companion ${thinking ? 'is-thinking' : ''}`} aria-hidden="true">
            <div ref={container} className="bot-canvas" />
            {!available && <span className="bot-fallback">✧</span>}
            <span className="bot-shadow" />
        </div>
    );
}
