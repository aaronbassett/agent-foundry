# Image Gen Plugin

AI-powered image generation using Google Gemini models via the [nanobanana MCP server](https://github.com/zhongweili/nanobanana-mcp-server).

## Prerequisites

- `uv` installed ([installation guide](https://docs.astral.sh/uv/getting-started/installation/))
- A `GEMINI_API_KEY` environment variable set with a valid [Google Gemini API key](https://makersuite.google.com/app/apikey)

## Features

- Generate images from text prompts using multiple Gemini models (NB2, Pro, Flash)
- Edit existing images with natural language instructions
- Control aspect ratio, resolution, and model selection
- Upload and manage files via Gemini Files API
- Smart model auto-selection based on prompt content

## Components

### MCP Server: nanobanana

Provides the following tools:

| Tool | Description |
|------|-------------|
| `generate_image` | Generate new images or edit existing ones |
| `edit_image` | Conversational image editing |
| `upload_file` | Upload files to Gemini Files API |
| `show_output_stats` | Output directory statistics |

### Skill: nanobanana

Workflow guidance for common image generation tasks including prompt crafting, model selection, aspect ratio control, and multi-image conditioning.

### Skill: image-compression

Compress, resize, and convert images using `caesiumclt`, `rimage`, and `gifsicle`. Covers web optimization (WebP/AVIF, responsive `srcset`/`<picture>`), batch jobs, GIF optimization, GIF modernization to video/animated WebP via `ffmpeg` (optional), and an interactive browser-based before/after preview with four comparison views (side-by-side, press-and-hold, alpha slider, before/after slider). Pairs with the nanobanana skill to optimize generated images for delivery.

These tools are checked for at runtime and are not bundled — the skill prompts for installation (Homebrew, cargo, winget, apt, etc.) when one is missing. `ffmpeg` is optional and only needed for GIF modernization.
