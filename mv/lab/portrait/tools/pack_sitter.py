"""Bake the CC BY 3.0 sitter surface, light transport and differential geometry. See scan-source.txt."""
import argparse
import json
from pathlib import Path
import struct

import numpy as np
from numba import njit
from PIL import Image
from scipy.ndimage import gaussian_filter, distance_transform_edt


@njit
def depth_buffer(projected, faces, size):
    out = np.full((size, size), -1.e6)
    for tri in faces:
        a, b, c = projected[tri[0]], projected[tri[1]], projected[tri[2]]
        x0 = max(0, int(np.floor(min(a[0], b[0], c[0]))))
        x1 = min(size - 1, int(np.ceil(max(a[0], b[0], c[0]))))
        y0 = max(0, int(np.floor(min(a[1], b[1], c[1]))))
        y1 = min(size - 1, int(np.ceil(max(a[1], b[1], c[1]))))
        ax, ay, bx, by = a[0]-c[0], a[1]-c[1], b[0]-c[0], b[1]-c[1]
        determinant = ax*by-ay*bx
        if abs(determinant)<1.e-9:
            continue
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                u = ((x-c[0])*by-(y-c[1])*bx)/determinant
                v = (ax*(y-c[1])-ay*(x-c[0]))/determinant
                if min(u, v, 1-u-v)>=0.:
                    out[y,x] = max(out[y,x], u*a[2]+v*b[2]+(1-u-v)*c[2])
    return out


def transport(xyz, normal, faces):
    size = 448
    def visible(direction):
        direction = direction / np.linalg.norm(direction)
        right = np.cross(direction, [0,1,0])
        right /= np.linalg.norm(right)
        up = np.cross(right,direction)
        coord = xyz @ np.stack([right,up,direction]).T
        scale = (size-4) / np.ptp(coord[:,:2],axis=0).max()
        coord[:,:2] = 2 + (coord[:,:2]-coord[:,:2].min(axis=0))*scale
        z = depth_buffer(coord,faces,size)
        ix = np.rint(coord[:,:2]).astype(int)
        return np.clip(1.-(z[ix[:,1],ix[:,0]]-coord[:,2]-.009)/.022,0,1)
    # Integrate cosine-weighted visibility in the sphere and under an area light.
    amb, weights, direct = np.zeros(len(xyz)), np.zeros(len(xyz)), np.zeros(len(xyz))
    light = np.array([-.65,.58,.49])
    for i in range(52):
        y = 1-2*(i+.5)/52
        r = np.sqrt(1-y*y)
        az = i*2.39996323
        ray = np.array([r*np.cos(az),y,r*np.sin(az)])
        w = np.maximum(normal@ray,0.)
        amb += w*visible(ray)
        weights += w
        if i<19:
            direct += visible(light+.38*ray)
    return np.column_stack((amb/np.maximum(.001,weights),direct/19))


def read_model(model):
    data = model.read_bytes()
    length = struct.unpack_from("<I", data, 12)[0]
    gltf = json.loads(data[20:20 + length])
    binary = data[28 + length:]
    prim = gltf["meshes"][0]["primitives"][0]

    def read(index, dtype, width):
        acc = gltf["accessors"][index]
        view = gltf["bufferViews"][acc["bufferView"]]
        offset = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
        stride = view.get("byteStride", np.dtype(dtype).itemsize * width)
        return np.ndarray((acc["count"], width), dtype=dtype, buffer=binary, offset=offset,
                          strides=(stride, np.dtype(dtype).itemsize))

    attr = prim["attributes"]
    return (read(attr["POSITION"], "<f4", 3).astype(float),
            read(attr["NORMAL"], "<f4", 3).astype(float),
            read(attr["TEXCOORD_0"], "<f4", 2).astype(float),
            read(prim["indices"], "<u2", 1).reshape(-1, 3))


SCALE = np.array([.444, .486, .448])


def pack(model, target):
    pos, normal, uv, faces = model
    xyz = pos * SCALE + [.0481, -.708, -.346]
    normal = normal / SCALE
    normal /= np.maximum(1e-12, np.linalg.norm(normal, axis=1, keepdims=True))
    octa = normal[:, :2] / abs(normal).sum(axis=1, keepdims=True)
    lower = normal[:, 2] < 0
    octa[lower] = (1 - abs(octa[lower, ::-1])) * np.where(octa[lower] < 0, -1, 1)
    lighting = np.rint(255 * transport(xyz, normal, faces)).astype("u1")
    # Browser images have their first row at the top. The original three.js
    # example uploads the external normal texture with Texture.flipY=true.
    image_uv = np.clip(np.column_stack((uv[:, 0], 1 - uv[:, 1])), 0, 1)
    texcoords = np.rint(image_uv * 65535).astype("<u2").view("u1").reshape(-1, 4)
    records = np.concatenate([np.rint(xyz * 10000).astype("<i2").view("u1").reshape(-1, 6),
                              np.rint(octa * 127).astype("i1").view("u1"), lighting, texcoords], axis=1)
    target.write_bytes(struct.pack("<4sII", b"LPS3", len(records), faces.size) + records.tobytes() + faces.tobytes())


def tangent_frames(pos, normal, uv, faces):
    a, b, c = faces.T
    e, f = pos[b] - pos[a], pos[c] - pos[a]
    u, v = uv[b] - uv[a], uv[c] - uv[a]
    determinant = u[:, 0] * v[:, 1] - v[:, 0] * u[:, 1]
    det = np.where(abs(determinant) > 1e-12, determinant, 1)
    du = (v[:, 1, None] * e - u[:, 1, None] * f) / det[:, None]
    dv = (u[:, 0, None] * f - v[:, 0, None] * e) / det[:, None]
    # UV seams have their own vertices in the supplied GLB. Accumulate the
    # tangent with corner-angle weights before orthogonalizing at the vertex.
    tangent = np.zeros_like(normal)
    unit_du = du / np.maximum(1e-12, np.linalg.norm(du, axis=1, keepdims=True))
    for corner in range(3):
        i, j, k = faces[:, corner], faces[:, (corner + 1) % 3], faces[:, (corner + 2) % 3]
        ab, ac = pos[j] - pos[i], pos[k] - pos[i]
        angle = np.arctan2(np.linalg.norm(np.cross(ab, ac), axis=1), np.einsum("ij,ij->i", ab, ac))
        np.add.at(tangent, i, angle[:, None] * unit_du)
    tangent -= normal * np.einsum("ij,ij->i", normal, tangent)[:, None]
    tangent /= np.maximum(1e-12, np.linalg.norm(tangent, axis=1, keepdims=True))
    sign = np.where(np.einsum("ij,ij->i", np.cross(normal[a], tangent[a]), dv) < 0, -1., 1.)
    # Dual tangents convert displacement gradients per UV into changes of the
    # surface normal in object units, even where the UV chart is stretched.
    metric = np.einsum("ij,ij->i", du, dv)
    su, sv = np.einsum("ij,ij->i", du, du), np.einsum("ij,ij->i", dv, dv)
    inv = 1 / np.maximum(1e-12, su * sv - metric * metric)
    return tangent, sign, (du * sv[:, None] - dv * metric[:, None]) * inv[:, None], (dv * su[:, None] - du * metric[:, None]) * inv[:, None]


@njit
def ramp(low, high, value):
    t = min(1., max(0., (value - low) / (high - low)))
    return t*t*(3 - 2*t)


@njit
def raster_relief(aligned_pos, normal, uv, faces, tangent, sign, dual_u, dual_v, sampled, slopes, scale, height_scale):
    size = sampled.shape[0]
    packed = np.full((size, size, 3), 128, dtype=np.uint8)
    coverage = np.zeros((size, size), dtype=np.uint8)
    priority = np.zeros((size, size), dtype=np.float32)
    for fi, tri in enumerate(faces):
        ta, tb, tc = tri[0], tri[1], tri[2]
        ax, ay = uv[ta, 0] * size - .5, (1 - uv[ta, 1]) * size - .5
        bx, by = uv[tb, 0] * size - .5, (1 - uv[tb, 1]) * size - .5
        cx, cy = uv[tc, 0] * size - .5, (1 - uv[tc, 1]) * size - .5
        den = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
        if abs(den) < 1e-10:
            continue
        for y in range(max(0, int(np.ceil(min(ay, by, cy)))), min(size, int(np.floor(max(ay, by, cy))) + 1)):
            for x in range(max(0, int(np.ceil(min(ax, bx, cx)))), min(size, int(np.floor(max(ax, bx, cx))) + 1)):
                b = ((x - ax) * (cy - ay) - (y - ay) * (cx - ax)) / den
                c = ((bx - ax) * (y - ay) - (by - ay) * (x - ax)) / den
                a = 1 - b - c
                if min(a, b, c) < -1e-7:
                    continue
                n = a * normal[ta] + b * normal[tb] + c * normal[tc]
                n /= max(1e-9, np.sqrt(np.dot(n, n)))
                t = a * tangent[ta] + b * tangent[tb] + c * tangent[tc]
                t -= n * np.dot(n, t)
                t /= max(1e-9, np.sqrt(np.dot(t, t)))
                bitan = sign[fi] * np.cross(n, t)
                m = sampled[y, x]
                slope = slopes[y, x, 0] * dual_u[fi] + slopes[y, x, 1] * dual_v[fi]
                slope -= n * np.dot(n, slope)
                # Displacement supplies only the fine scales lost by the 1K
                # normal map. Cap extreme slopes at chart discontinuities.
                slope *= height_scale / max(1., height_scale * np.sqrt(np.dot(slope, slope)) / .19)
                measured = (n * m[2] + t * m[0] + bitan * m[1] - slope) / scale
                measured /= max(1e-9, np.sqrt(np.dot(measured, measured)))
                base = n / scale
                base /= max(1e-9, np.sqrt(np.dot(base, base)))
                for k in range(3):
                    packed[y, x, k] = int(min(255., max(0., np.rint((measured[k] - base[k]) * (127/.75)) + 128)))
                q = a * aligned_pos[ta] + b * aligned_pos[tb] + c * aligned_pos[tc]
                face = ramp(-.95, -.72, q[1]) * ramp(-.02, .32, q[2])
                ear = (ramp(.51, .65, abs(q[0])) * ramp(-.62, -.28, q[2]) *
                       ramp(-.48, -.26, q[1]) * (1 - ramp(.26, .49, q[1])))
                priority[y, x] = max(face, ear)
                coverage[y, x] = 1
    return packed, coverage, priority


def distribute_resolution(packed, priority):
    # Keep native sampling on the face and pinna. Shoulders and the back of the
    # skull retain the broad shifts of normal that can resolve in the wide shot.
    image = Image.fromarray(packed)

    def smooth_level(scale):
        low = image.resize((image.width // scale, image.height // scale), Image.Resampling.BOX)
        return np.asarray(low.resize(image.size, Image.Resampling.BILINEAR), dtype=np.float32)

    def blend(low, high):
        t = np.clip((priority-low)/(high-low), 0, 1)[:, :, None]
        return t*t*(3-2*t)

    coarse, middle = smooth_level(12), smooth_level(4)
    mixed = coarse + blend(.05, .45)*(middle-coarse)
    full = blend(.52, .92)
    mixed += full*(packed-mixed)
    quantum = 6 - 2*full
    return np.clip(np.rint(128 + quantum*np.rint((mixed-128)/quantum)), 0, 255).astype(np.uint8)


def bake_relief(model, tangent_file, displacement_file, target):
    pos, normal, uv, faces = model
    normal = normal / np.linalg.norm(normal, axis=1, keepdims=True)
    size = 1536
    image = Image.open(tangent_file).convert("RGB").resize((size,size), Image.Resampling.BILINEAR)
    sampled = np.asarray(image).astype(np.float32) * (2/255) - 1
    disp = Image.open(displacement_file).convert("L").resize((size,size), Image.Resampling.LANCZOS)
    height = np.asarray(disp).astype(np.float32) / 255
    high = height - gaussian_filter(height, 1.7)
    dy, dx = np.gradient(high)
    slopes = np.stack([dx*size, -dy*size], axis=-1)
    tangent, sign, dual_u, dual_v = tangent_frames(pos, normal, uv, faces)
    packed, coverage, priority = raster_relief(pos*SCALE + [.0481, -.708, -.346], normal, uv,
                                              faces, tangent, sign, dual_u, dual_v, sampled, slopes, SCALE, .12)
    # Extend all three object-space components beyond island boundaries, where
    # linear filtering and mip generation would otherwise draw in the flat fill.
    dist, near = distance_transform_edt(coverage == 0, return_indices=True)
    gutter = (coverage == 0) & (dist <= 24)
    packed[gutter] = packed[near[0][gutter], near[1][gutter]]
    priority[gutter] = priority[near[0][gutter], near[1][gutter]]
    encoding = distribute_resolution(packed, priority)
    Image.fromarray(encoding).save(target, format="WEBP", lossless=True, method=6)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("model", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--relief", nargs=3, type=Path, metavar=("NORMAL", "DISPLACEMENT", "OUTPUT"))
    args = parser.parse_args()
    model = read_model(args.model)
    pack(model, args.output)
    if args.relief:
        bake_relief(model, *args.relief)
