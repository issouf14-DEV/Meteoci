/**
 * Point d'entrée unique de Zod pour l'application.
 *
 * - `zod/mini` (API fonctionnelle) : seules les fonctions utilisées sont
 *   embarquées dans le bundle, au lieu de tout l'objet `z` classique.
 * - `jitless` : désactive la compilation JIT de Zod (`new Function`), interdite
 *   par la CSP (`script-src 'self'`). Sans cette option, Zod sonde `eval` et
 *   chaque chargement produit des violations CSP dans la console.
 *
 * La configuration est appliquée à l'évaluation de ce module, donc avant la
 * création de tout schéma : importer `z` depuis "@/lib/zod", jamais depuis "zod".
 */
import * as z from "zod/mini";

z.config({ jitless: true });

export { z };
