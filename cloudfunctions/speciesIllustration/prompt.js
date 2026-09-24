const {trustedSpecies}=require("./species");
const {withVariant,normalizeVariant}=require("./artwork-variants");
const PUBLIC_STYLE_VERSION="watercolor-t2i-v2";
const BASE_PROMPT=name=>`Create a full-body natural-history watercolor plate of "${name}" with scientifically faithful anatomy, proportions, diagnostic markings, plumage, fur, scales, or botanical structures. Show one complete subject in a restrained, species-appropriate habitat, with translucent watercolor washes, fine colored-pencil details, subtle cold-press paper texture, balanced museum field-guide composition, and clear silhouette separation. No text, letters, numbers, labels, card frame, logo, signature, photographic look, fantasy traits, duplicated anatomy, invented markings, or another species.`;
// 默认变体时输出与此前完全一致，只有显式选择变体才会追加呈现子句。
function buildPublicSpeciesPrompt(id,variant){const {name}=trustedSpecies(id);return withVariant(BASE_PROMPT(name),normalizeVariant(variant))}
module.exports={PUBLIC_STYLE_VERSION,buildPublicSpeciesPrompt};
