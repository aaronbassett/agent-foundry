# Nanobanana MCP Server - Full Parameter Reference

## generate_image

The primary tool for creating and editing images.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `prompt` | `string` (required) | - | Image prompt (1-8192 chars). Include subject, composition, action, location, style, and text to render. |
| `n` | `int` | `1` | Number of images to generate (1-4). Model may return fewer. |
| `negative_prompt` | `string \| null` | `null` | Things to avoid in the output (max 1024 chars). |
| `system_instruction` | `string \| null` | `null` | Optional system tone/style guidance (max 512 chars). |
| `input_image_path_1` | `string \| null` | `null` | Path to first input image for composition/conditioning. |
| `input_image_path_2` | `string \| null` | `null` | Path to second input image. |
| `input_image_path_3` | `string \| null` | `null` | Path to third input image. |
| `file_id` | `string \| null` | `null` | Files API file ID (e.g., `files/abc123`). Takes precedence over `input_image_path_*`. |
| `mode` | `string` | `"auto"` | Operation mode: `generate`, `edit`, or `auto` (auto-detected from inputs). |
| `model_tier` | `string \| null` | `"auto"` | Model selection: `flash`, `nb2`, `pro`, or `auto`. |
| `resolution` | `string \| null` | `"high"` | Output resolution: `high`, `4k`, `2k`, `1k`. 4K/2K only with Pro model. |
| `thinking_level` | `string \| null` | `null` | Pro model reasoning depth: `low` (faster) or `high` (better quality). |
| `enable_grounding` | `bool` | `true` | Enable Google Search grounding for factual accuracy. |
| `aspect_ratio` | `string \| null` | `null` | Output aspect ratio. Values: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`. |
| `output_path` | `string \| null` | `null` | Save location. File path (with extension) or directory. Defaults to `IMAGE_OUTPUT_DIR` or `~/nanobanana-images`. |
| `return_full_image` | `bool \| null` | `null` | Return full-resolution images instead of thumbnails. Warning: 3-7MB each for 4K. Defaults to `RETURN_FULL_IMAGE` env var. |

### Mode Auto-Detection

- If `file_id` is provided or exactly one `input_image_path_*` is set → `edit` mode
- Otherwise → `generate` mode

### Model Auto-Selection (model_tier="auto")

Routes to **NB2** by default unless Pro is clearly needed:

**Pro selected when:**
- Quality keywords in prompt: "4K", "professional", "production", "high-res", "HD"
- High thinking level requested: `thinking_level="HIGH"`
- Multi-image conditioning with multiple input images

**NB2 selected when:**
- Standard requests
- Speed keywords: "quick", "draft", "sketch", "rapid"
- Batch generation (`n > 2`)

## edit_image

Conversational editing on a single base image.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `instruction` | `string` (required) | - | Natural language edit instruction (e.g., "Add a hat to the cat"). |
| `base_image_b64` | `string` (required) | - | Base64-encoded image to edit. |
| `mime_type` | `string` | `"image/png"` | MIME type of the base image (e.g., `image/png`, `image/jpeg`). |

### When to Use edit_image vs generate_image

- Use `edit_image` when the base image is already in memory as base64 data
- Use `generate_image` with `input_image_path_*` when editing a file on disk
- Use `generate_image` with `file_id` when editing a previously uploaded image

## upload_file

Upload files to the Gemini Files API for reuse across prompts.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `path` | `string` (required) | - | Server-accessible file path to upload. |
| `display_name` | `string \| null` | `null` | Optional display name for the file. |

### Returns

```json
{
  "uri": "gemini://files/abc123",
  "name": "files/abc123",
  "mime_type": "image/png",
  "size_bytes": 1234567
}
```

Use the returned `name` field as `file_id` in `generate_image`.

### When to Upload

- Images larger than 20MB
- Images reused across multiple generation calls
- Source images for repeated editing workflows

## show_output_stats

Display statistics about the output directory and recently generated images.

### Parameters

No parameters required.

### Returns

Statistics including:
- Total images generated
- Storage usage
- Recent generation history
- Files API usage

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | Yes* | - | Google Gemini API key |
| `NANOBANANA_AUTH_METHOD` | No | `api_key` | Auth method: `api_key`, `vertex_ai`, or `auto` |
| `GCP_PROJECT_ID` | For Vertex AI | - | Google Cloud project ID |
| `GCP_REGION` | For Vertex AI | `us-central1` | Google Cloud region |
| `IMAGE_OUTPUT_DIR` | No | `~/nanobanana-images` | Default image output directory |
| `RETURN_FULL_IMAGE` | No | `false` | Return full-res images in MCP response |

*Required unless using Vertex AI authentication.

## Model Comparison

| Feature | NB2 (Default) | Pro | Flash |
|---------|---------------|-----|-------|
| Model | Gemini 3.1 Flash Image | Gemini 3 Pro Image | Gemini 2.5 Flash Image |
| Speed | ~2-4s | ~5-8s | ~2-3s |
| Max Resolution | 4K (3840px) | 4K (3840px) | 1024px |
| Search Grounding | Yes | Yes | No |
| Thinking Levels | No | LOW/HIGH | No |
| Subject Consistency | Up to 5 chars, 14 objects | Advanced | Basic |
| Text Rendering | Precision | Precision | Basic |
| Best For | Production, marketing, most tasks | Complex compositions, max reasoning | Quick drafts, high volume |
