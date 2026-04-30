export function getClamp(Fmin: number, Fmax: number, R = 16, Wmin = 320, Wmax = 1920)
{
    const slope = (Fmax - Fmin) / (Wmax - Wmin);
    const intercept = Fmin - slope * Wmin;
    return `clamp(${(Fmin / R).toFixed(6)}rem, ${(intercept / R).toFixed(6)}rem + ${(slope * 100).toFixed(6)}vw, ${(Fmax / R).toFixed(6)}rem)`;
}
