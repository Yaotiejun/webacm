/** Copyright Stewart Allen -- All Rights Reserved */

const PI2 = Math.PI * 2;

let cache = {};
let lastVal;
let lastRes = 0;
let lastSlice = 0;

/**
 * @param off {number} z offset value from 0-1
 * @param res {number} resolution (pixels/slices per side)
 */
export function slice(off, res, val) {
    // auto clear cache if it hasn't been hit in the last 20 seconds
    // or the requested resolution or tip values have changed
    let now = Date.now();
    if (res !== lastRes || val !== lastVal || now - lastSlice > 20000) {
        cache = {};
    }
    lastVal = val;
    lastRes = res;
    lastSlice = now;
    let rez = parseInt(res || 200);
    let inc = PI2 / rez;
    let z = PI2 * off;
    let key = (z % PI2).round(3);
    let hit = cache[key];
    if (hit) {
        return hit;
    }
    let tip = val || 0;
    let edge = [];
    let vals = [];
    let points = 0;
    let points_lr = 0;
    let points_td = 0;
    for (let x=0; x<PI2; x += inc) {
        let vrow = []; // raw values row
        let erow = []; // edge values row
        edge.push(erow);
        vals.push(vrow);
        for (let y=0; y<PI2; y += inc) {
            erow.push(0);
            vrow.push(
                Math.sin(x) * Math.cos(y) +
                Math.sin(y) * Math.cos(z) +
                Math.sin(z) * Math.cos(x)
            );
        }
    }

    // left-right threshold search (red)
    vals.forEach((vrow, y) => {
        let erow = edge[y];
        let lval = vrow[vrow.length - 1];
        vrow.forEach((val, x) => {
            if (
                (lval <= tip && val >= tip) || (lval >= tip && val <= tip) ||
                (lval <= -tip && val >= -tip) || (lval >= -tip && val <= -tip)
            ) {
                erow[x] = 1;
                points++;
                points_lr++;
            }
            lval = val;
        })
    });

    // top-down threshold search (green)
    for (let x=0; x<rez; x++) {
        let lval = vals[vals.length-1][x];
        for (let y=0; y<rez; y++) {
            let val = vals[y][x];
            if (
                (lval <= tip && val >= tip) || (lval >= tip && val <= tip) ||
                (lval <= -tip && val >= -tip) || (lval >= -tip && val <= -tip)
            ) {
                if (edge[y][x]) {
                    edge[y][x] = 3;
                } else {
                    edge[y][x] = 2;
                    points++
                }
                points_td++;
            }
            lval = val;
        }
    }

    // determine prevailing direction for chaining
    let dir = points_td > points_lr ? 'lr' : 'td';

    // create sparse representation
    let sparse = [];
    let center = rez / 2;
    edge.forEach((row,y) => {
        row.forEach((val,x) => {
            if (val) {
                let dx = Math.abs(x - center);
                let dy = Math.abs(y - center);
                sparse.push({x: x/rez, y: y/rez, val, dist: Math.max(dx,dy)});
            }
        });
    });
    sparse.sort((a,b) => {
        return b.dist - a.dist;
    });

    // join sparse points array by closest distance
    let polys = [];
    let chain;
    let added;
    let cleared = 0;
    let maxdist = 0.05;

    do {
        chain = null;
        for (let i=0; i<sparse.length; i++) {
            if (sparse[i]) {
                // start of a new chain
                chain = [ sparse[i] ];
                sparse[i] = null;
                break;
            }
        }
        if (!chain) break;

        do {
            added = false;
            let last = chain[chain.length-1];
            let best_i = -1;
            let best_d = Infinity;
            for (let i=0; i<sparse.length; i++) {
                let p = sparse[i];
                if (!p) continue;
                let dx = p.x - last.x;
                let dy = p.y - last.y;
                let dd = Math.sqrt(dx*dx + dy*dy);
                if (dd < best_d && dd < maxdist) {
                    best_d = dd;
                    best_i = i;
                }
            }
            if (best_i >= 0) {
                chain.push(sparse[best_i]);
                sparse[best_i] = null;
                added = true;
            }
        } while (added);

        polys.push(chain);
        cleared++;
    } while (cleared < points && chain);

    cache[key] = polys;
    return polys;
}
