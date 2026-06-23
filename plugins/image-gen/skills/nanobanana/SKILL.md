---
name: nanobanana
description: >-
  This skill should be used when the user asks to "generate an image", "create an image",
  "make a picture", "draw me a", "create artwork", "make an illustration",
  "edit an image", "modify a photo", "upload a file to Gemini", "check image stats",
  "change the aspect ratio", or mentions nanobanana, Gemini image generation, or AI art
  creation. Triggers include: "generate an image", "edit image", "create a picture",
  "4K image", "model tier", "aspect ratio", "negative prompt", "style transfer".
---

# Nanobanana Image Generation

Generate, edit, and manage AI images using the nanobanana MCP server powered by Google Gemini models.

## Prerequisites

A `GEMINI_API_KEY` environment variable must be set. Obtain a key from [Google AI Studio](https://makersuite.google.com/app/apikey).

## Available MCP Tools

| Tool | Purpose |
|------|---------|
| `generate_image` | Generate new images or edit existing ones |
| `edit_image` | Conversational image editing on a base image |
| `upload_file` | Upload files to Gemini Files API |
| `show_output_stats` | Display output directory statistics |

## Common Workflows

### 1. Generate a Simple Image

Call `generate_image` with a descriptive prompt. Include subject, composition, action, location, and style for best results.

```
generate_image(
  prompt="A golden retriever sitting in a sunlit meadow, watercolor style",
  n=1
)
```

Always craft detailed, descriptive prompts. Vague prompts produce generic results.

### 2. Generate Multiple Images

Set `n` (1-4) to generate multiple variations from the same prompt.

```
generate_image(
  prompt="Minimalist logo design for a coffee shop called 'Bean There'",
  n=3
)
```

### 3. Control Aspect Ratio

Specify `aspect_ratio` for different output formats. Supported values: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`.

```
generate_image(
  prompt="Cinematic landscape at sunset",
  aspect_ratio="21:9"
)
```

Common use cases:
- **Social media posts**: `1:1` (Instagram), `9:16` (Stories/Reels)
- **Video thumbnails**: `16:9`
- **Phone wallpapers**: `9:16`
- **Cinematic/ultrawide**: `21:9`
- **Print/portrait**: `3:4` or `2:3`

### 4. Choose a Model Tier

Three models available via `model_tier`:

| Tier | Model | Speed | Max Resolution | Best For |
|------|-------|-------|----------------|----------|
| `auto` (default) | Smart selection | Varies | Varies | Recommended — routes to NB2 or Pro based on prompt |
| `nb2` | Gemini 3.1 Flash Image | ~2-4s | 4K (3840px) | Most tasks, production assets |
| `pro` | Gemini 3 Pro Image | ~5-8s | 4K (3840px) | Complex compositions, max quality |
| `flash` | Gemini 2.5 Flash Image | ~2-3s | 1024px | Quick drafts, high-volume |

```
generate_image(
  prompt="Intricate fantasy map with labeled regions",
  model_tier="pro",
  thinking_level="HIGH"
)
```

Use `auto` (the default) in most cases — it typically routes to `nb2`. Explicitly select `pro` for complex scenes requiring deep reasoning, or `flash` for rapid prototyping. For full model comparison, see `references/parameters.md`.

### 5. Edit an Existing Image

Use `edit_image` for conversational edits on a single image. Provide a base64-encoded image and a natural language instruction.

```
edit_image(
  instruction="Add a knitted wizard hat to the cat",
  base_image_b64="<base64 data>",
  mime_type="image/png"
)
```

Alternatively, use `generate_image` with `input_image_path_1` for file-based editing:

```
generate_image(
  prompt="Remove the background and replace with a gradient",
  input_image_path_1="/path/to/image.png",
  mode="edit"
)
```

### 6. Multi-Image Conditioning

Combine up to 3 input images for composition, style transfer, or blending:

```
generate_image(
  prompt="Combine the style of the first image with the subject of the second",
  input_image_path_1="/path/to/style-reference.png",
  input_image_path_2="/path/to/subject.png"
)
```

### 7. Use Files API for Large or Reusable Images

Upload images larger than 20MB or images reused across multiple prompts:

```
upload_file(
  path="/path/to/large-image.png",
  display_name="Product photo"
)
```

Then reference the returned `file_id` in subsequent `generate_image` calls:

```
generate_image(
  prompt="Add a holiday theme to this product photo",
  file_id="files/abc123",
  mode="edit"
)
```

### 8. Control Output Location

Specify where generated images are saved with `output_path`:

```
generate_image(
  prompt="Company logo in blue and white",
  output_path="/path/to/project/assets/logo.png"
)
```

If not specified, images save to the `IMAGE_OUTPUT_DIR` env var or `~/nanobanana-images`.

**Correct the extension after every generation.** The model frequently returns
**JPEG bytes even when `output_path` ends in `.png`**, and the response
`mime_type` is not reliable — so the saved file's extension can mismatch its
actual content. Never trust the requested extension or the metadata; detect the
real type from the file's bytes and rename. Run the bundled script on each saved
path (the result's `file_paths` entries):

```bash
scripts/fix-image-extension.sh /path/to/project/assets/logo.png
# detects the true type via `file --mime-type` and renames if needed,
# e.g. logo.png (actually JPEG) -> logo.jpg; prints the corrected path
```

It maps jpeg→`.jpg`, png→`.png`, webp→`.webp`, gif→`.gif`, avif→`.avif`, leaves
already-correct files untouched, and prints the corrected path on stdout. Use
that corrected path in any follow-up (e.g. compression via `image-compression`).

### 9. Use Negative Prompts

Specify what to avoid in the output:

```
generate_image(
  prompt="Professional headshot photo, studio lighting",
  negative_prompt="blurry, distorted, cartoon, illustration"
)
```

### 10. High-Quality Production Images

For maximum quality output, combine Pro model with 4K resolution and grounding:

```
generate_image(
  prompt="Product photography: leather wallet on marble surface, dramatic lighting",
  model_tier="pro",
  resolution="4k",
  enable_grounding=true,
  thinking_level="HIGH"
)
```

## Prompt Writing Tips

- **Be specific**: "A tabby cat sleeping on a red velvet cushion, soft afternoon light" beats "a cat"
- **Include style**: Mention artistic style (watercolor, oil painting, photorealistic, minimalist)
- **Specify lighting**: "golden hour", "studio lighting", "dramatic shadows"
- **Add composition**: "close-up", "wide angle", "bird's eye view", "centered"
- **Text in images**: Use `system_instruction` for tone and include exact text to render in the prompt
- **Avoid ambiguity**: The more precise the prompt, the better the result

## Optimizing Generated Images

Generated images are large (up to 4K) — often far larger than needed for web,
email, or app assets. After generating (and after correcting the file extension,
see step 8), offer to optimize them with the
**image-compression** skill (also in this plugin), which compresses, resizes,
and converts images using `caesiumclt`, `rimage`, and `gifsicle`, and can show
the user an interactive before/after preview.

Hand off to it when the user wants to:
- Reduce the file size of a generated image, or hit a size budget.
- Convert a generation to **WebP** or **AVIF** for the web.
- Produce responsive resolutions (`srcset` / `<picture>`).
- Compare compression levels visually before choosing one.

Typical follow-up: generate at high quality with nanobanana, then compress for
delivery. For example, after saving a 4K hero image, suggest resizing to the
layout width and emitting WebP + AVIF. Invoke the `image-compression` skill to
do this rather than reimplementing compression here.

## Additional Resources

### Reference Files

For complete parameter documentation, consult:
- **`references/parameters.md`** - Full parameter reference for all tools with types and defaults

### Scripts

- **`scripts/fix-image-extension.sh`** - Rename a generated file so its extension matches its actual content (the model may save JPEG bytes under a `.png` path). Run on each saved path after generation.

### Related Skills

- **`image-compression`** - Compress, resize, and convert generated images
  (WebP/AVIF, responsive sets, GIF optimization) with a visual before/after
  preview. Use it to optimize nanobanana output for the web.
