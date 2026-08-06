# Design QA — 巫師公會交誼廳

## Evidence

- Source visual truth:
  - `/Users/cybermonkpro/Dropbox/- AI光影實驗室 -/20260807-自由派對/巫師公會交誼廳/巫師公會交誼廳 視覺參考/自由派對-A1-創作宣言海報-印刷版.pdf`
  - `/Users/cybermonkpro/Dropbox/- AI光影實驗室 -/20260807-自由派對/巫師公會交誼廳/巫師公會交誼廳 視覺參考/Photoroom_20260806_173343.png`
  - The two additional supplied badge references were also used as role variants.
- Browser-rendered implementation screenshots:
  - `qa-checkin.png`
  - `qa-badge-preview.png`
  - `qa-lounge.png`
  - `qa-admin.png`
  - `qa-countdown.png`
  - `qa-mobile-match.png`
- Combined comparison evidence:
  - `qa-comparison-lounge.png`
  - `qa-comparison-badge.png`
- Viewport: 1280 × 720 CSS px; browser device pixel ratio 2. Browser capture normalized to 1280 × 720 output pixels.
- Source pixels: poster render 2807 × 3974; primary badge 1512 × 2016.
- State: logged-out mobile welcome; role/profile flow; badge preview; checked-in state; public lounge idle; host dashboard; matched reveal.

## Findings

- No actionable P0, P1, or P2 visual differences remain.
- Typography: the implementation uses Archivo Black for compact Latin display text and Noto Sans TC for Chinese UI. The source poster's exact custom display lettering is not available as editable type, but weight, compression, scale contrast, black shadow blocks, and abrupt line breaks preserve its visual hierarchy without reducing form legibility.
- Spacing and layout rhythm: the mobile experience retains a tall badge-like format, while the public lounge converts the poster composition into a 16:9 event display. Card density, QR prominence, host controls, and mobile form targets remain readable at their intended surfaces.
- Colors and visual tokens: acid yellow, cyan, hot pink, purple, orange, black, and paper white match the supplied references and are reused consistently across role states and the three product surfaces.
- Image quality and asset fidelity: the supplied poster render and all three supplied badge images are used directly. They are not replaced by CSS drawings, placeholder art, or recreated logos. Cropping stays inside intended card or background containers without visible distortion.
- Copy and content: role names, real-world role mappings, privacy choices, call-to-action language, countdown copy, host prompts, and match reveal all match the PRD's world and functional intent.
- Accessibility and interaction: keyboard focus is visible, buttons use descriptive accessible names, form fields have clear text labels/placeholders, and color-coded roles also include icon and text labels.

## Full-view comparison

- `qa-comparison-lounge.png` confirms that the public lounge inherits the poster's large black/acid headline hierarchy and applies the supplied badge's sharp industrial framing to the participant wall.
- `qa-comparison-badge.png` confirms that the dynamic member data sits inside the supplied badge frame and preserves the original image's metallic, graffiti, and high-contrast art direction.

## Focused-region comparison

- The badge itself was evaluated as the focused region because it carries the most fidelity-sensitive imagery, typography, and dynamic data. The actual source frame is reused at its native 3:4 ratio; photo, role, nickname, and skills remain inside the source's white information zone.
- No additional focused region was needed for the dashboard because it has no direct screen mock; it deliberately derives tokens and hierarchy from the poster rather than claiming one-to-one layout fidelity.

## Primary interactions tested

1. Open mobile check-in and start the badge flow.
2. Select 機甲師 and continue.
3. Enter a nickname, add a skill, and enable preview.
4. Review consent switches and complete check-in.
5. Confirm the new participant appears on the public lounge wall.
6. Open the host dashboard, select a 10-second countdown, and start matching.
7. Confirm the public screen reaches the matched state and the phone receives a private partner reveal.
8. Check browser console warning/error logs: none present.

## Comparison history

- Pass 1: no P0/P1/P2 issues found after normalization and direct combined-image review. No visual fix loop was required.
- Residual P3: on very short desktop windows, the mobile preview intentionally scrolls inside the phone frame; the first viewport shows the badge before lower consent controls. This preserves readable card scale and is acceptable for the responsive prototype.

## Implementation checklist

- [x] Mobile check-in journey is functional.
- [x] Badge uses supplied visual reference assets.
- [x] Public lounge includes live participant wall and QR entry.
- [x] Host countdown and match state synchronize across surfaces.
- [x] 1280 × 720 desktop display inspected.
- [x] Mobile responsive rules included.
- [x] Browser console errors checked.
- [x] Production build and Sites packaging tests pass.

final result: passed
