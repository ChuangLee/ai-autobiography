"""Rebuild the anatomical study with `python fit_contours.py canonical_face_model.obj`.

The generic model and its Apache license are identified in anatomy-source.txt.
Only smooth radial displacements are retained. No mesh is used during playback.
"""

import argparse
from pathlib import Path
import re

import numpy as np
from scipy.interpolate import PchipInterpolator, RBFInterpolator


PORTRAIT = Path(__file__).resolve().parents[1]


def fit_measurements(obj):
    with obj.open() as source:
        vertices = np.loadtxt([line[2:] for line in source if line.startswith("v ")])
    vertices = vertices[vertices[:, 0] >= 0]
    y = (vertices[:, 1] - 2.63) * .046
    x = vertices[:, 0] * .0475 * (1 + .075 * np.exp(-((y + .37) / .15) ** 2))
    depth = (vertices[:, 2] + 2.65) * .049
    # Close the template's relaxed mouth before measuring the lower lip.
    closed = .022 / (1 + np.exp(np.clip((y + .319) / .004, -60, 60)))
    y += closed * np.exp(-((y + .319) / .095) ** 2) * np.exp(-(x / .14) ** 4)

    source = (PORTRAIT / "anatomy.wgsl.js").read_text()
    section = source.split("const skull=", 1)[1].split(");", 1)[0]
    rings = np.array([list(map(float, row.split(","))) for row in re.findall(r"vec3f\(([^)]+)\)", section)])
    shape = PchipInterpolator(np.linspace(-.56, .56, len(rings)), rings, axis=0)
    width, length, centre = shape(np.clip(y, -.56, .56)).T
    angle = np.arctan2(x, depth - centre)
    ellipse = 1 / np.hypot(np.sin(angle) / width, np.cos(angle) / length)
    delta = np.hypot(x, depth - centre) - ellipse
    mask = (angle < 1.52) & (y > -.518) & (y < .265)
    points = []
    offsets = []

    def add(angles, heights, values):
        points.append(np.column_stack((angles, heights * 3.3)))
        offsets.append(values)

    for sign in (1, -1):
        add(sign * angle[mask], y[mask], delta[mask])
    # Smoothly return from the measured face to the authored temples and scalp.
    angles = np.linspace(-1.68, 1.68, 18)
    for height in (-.57, .38, .50):
        add(angles, np.full_like(angles, height), np.zeros_like(angles))
    heights = np.linspace(-.56, .38, 24)
    for angle in (-1.73, 1.73):
        add(np.full_like(heights, angle), heights, np.zeros_like(heights))

    fit = RBFInterpolator(np.concatenate(points), np.concatenate(offsets), smoothing=.0009)
    angles, heights = np.meshgrid(np.linspace(0, 1.78, 37), np.linspace(-.56, .42, 71))
    grid = np.column_stack([angles.ravel(), heights.ravel() * 3.3])
    return fit(grid).reshape(angles.shape)


def write_shader(field):
    height, weights, angle = np.linalg.svd(field, full_matrices=False)
    lines = [
        "// A separable spline over angle and height, fitted to generic anatomical landmarks.",
        "// Four components per vector; both sets are combined by two dot products.",
        "export const relief = `",
    ]
    for name, samples in (("angle", angle[:8].T), ("height", height[:, :8] * weights[:8])):
        count = len(samples)
        for column in (0, 4):
            key = f"{name}{column}"
            lines.append(f"const {key}=array<vec4f,{count}>(")
            vectors = ["vec4f(" + ",".join(f"{value:.6f}" for value in row[column:column+4]) + ")" for row in samples]
            lines.extend([",\n".join(vectors), ");"])
            lines.append(
                f"fn sample_{key}(u:f32)->vec4f{{let k=clamp(u,0.,{count-1}.);let i=i32(k);let t=fract(k);"
                f"let a={key}[max(i-1,0)];let b={key}[i];let c={key}[min(i+1,{count-1})];let d={key}[min(i+2,{count-1})];"
                "return b+.5*t*(c-a+t*(2.*a-5.*b+4.*c-d+t*(-a+3.*b-3.*c+d)));}"
            )
    lines += [
        "fn contourRelief(a:f32,y:f32)->f32{let u=a*20.22472;let v=(y+.56)*71.42857;return dot(sample_angle0(u),sample_height0(v))+dot(sample_angle4(u),sample_height4(v));}",
        "`;",
    ]
    (PORTRAIT / "anatomy-contours.js").write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("obj", type=Path)
    write_shader(fit_measurements(parser.parse_args().obj))
