/**
 * Phone page API workflow builders.
 * Lustify Krea Turbo / Moss Image bf16 / WAI & Hassaku (Illustrious SDXL).
 */
(function (root) {
  const LUSTIFY = {
    id: "lustify",
    label: "Lustify Krea Turbo",
    unet: "lustify-v10-krea-turbo-fp16.safetensors",
    clip: "qwen3vl_4b_bf16.safetensors",
    vae: "wan_2.1_vae.safetensors",
    defaults: { steps: 30, cfg: 1.0, width: 1280, height: 2560, sampler: "euler", scheduler: "simple" },
    neg:
      "extra heads, multiple heads, two heads, three heads, duplicate face, twin heads, conjoined, " +
      "extra limbs, fused bodies, bad anatomy, deformed face, mutated hands, " +
      "blurry, lowres, watermark, text, logo, cartoon, 3d render, plastic skin, penis, cock, dick, male genitals",
  };

  const MOSS = {
    id: "moss",
    label: "Moss Image bf16",
    unet: "moss_image_sft_bf16.safetensors",
    clip: "qwen3.5_9b_w4a8_gptq.safetensors",
    vae: "flux2-vae_small.safetensors",
    defaults: { steps: 25, cfg: 2.5, width: 1024, height: 1024, sampler: "er_sde", scheduler: "simple" },
    neg: "",
  };

  const WAI = {
    id: "wai",
    label: "WAI Illustrious",
    ckpt: "waiIllustriousSDXL_v170.safetensors",
    defaults: { steps: 30, cfg: 5.5, width: 1024, height: 1536, sampler: "euler_ancestral", scheduler: "normal" },
    neg: "bad quality, worst quality, worst detail, sketch, censor, censored, mosaic, bar censor, loli, child, petite, young, flat chest, bad hands, extra fingers, bad anatomy",
  };

  const HASSAKU = {
    id: "hassaku",
    label: "Hassaku Illustrious",
    ckpt: "hassakuXLIllustrious_v22.safetensors",
    defaults: { steps: 30, cfg: 5.5, width: 1024, height: 1536, sampler: "euler_ancestral", scheduler: "normal" },
    neg: "bad quality, worst quality, worst detail, sketch, censor, censored, mosaic, bar censor, loli, child, petite, young, flat chest, bad hands, extra fingers, bad anatomy",
  };

  const PRESETS = { lustify: LUSTIFY, moss: MOSS, wai: WAI, hassaku: HASSAKU };

  function buildLustifyWorkflow(opts) {
    const text = String(opts.prompt || "");
    const neg =
      opts.negative != null && String(opts.negative).length
        ? String(opts.negative)
        : LUSTIFY.neg;
    const steps = Number(opts.steps) || LUSTIFY.defaults.steps;
    const width = Number(opts.width) || LUSTIFY.defaults.width;
    const height = Number(opts.height) || LUSTIFY.defaults.height;
    const seed = Number(opts.seed) || 0;
    const cfg = opts.cfg != null ? Number(opts.cfg) : LUSTIFY.defaults.cfg;
    const prefix = opts.prefix || "phone_" + seed;

    return {
      "1": {
        class_type: "UNETLoader",
        inputs: { unet_name: LUSTIFY.unet, weight_dtype: "default" },
      },
      "2": {
        class_type: "CLIPLoader",
        inputs: { clip_name: LUSTIFY.clip, type: "krea2", device: "default" },
      },
      "3": {
        class_type: "VAELoader",
        inputs: { vae_name: LUSTIFY.vae },
      },
      "4": {
        class_type: "ModelSamplingAuraFlow",
        inputs: { model: ["1", 0], shift: 4.0, sampling: "flow" },
      },
      "5": {
        class_type: "CLIPTextEncode",
        inputs: { text: text, clip: ["2", 0] },
      },
      "6": {
        class_type: "CLIPTextEncode",
        inputs: { text: neg, clip: ["2", 0] },
      },
      "7": {
        class_type: "EmptyLatentImage",
        inputs: { width: width, height: height, batch_size: 1 },
      },
      "8": {
        class_type: "KSampler",
        inputs: {
          seed: seed,
          steps: steps,
          cfg: cfg,
          sampler_name: "euler",
          scheduler: "simple",
          denoise: 1.0,
          model: ["4", 0],
          positive: ["5", 0],
          negative: ["6", 0],
          latent_image: ["7", 0],
        },
      },
      "9": {
        class_type: "VAEDecode",
        inputs: { samples: ["8", 0], vae: ["3", 0] },
      },
      "10": {
        class_type: "SaveImage",
        inputs: { filename_prefix: prefix, images: ["9", 0] },
      },
    };
  }

  /**
   * Flat API graph for Moss Image bf16 (no prompt-enhancer / TextGenerate).
   * Matches official t2i subgraph core: UNET + CLIP(moss_image) + flux2-vae_small
   * + EmptyFlux2LatentImage + SkipLayerGuidanceDiTSimple(single=22) + KSampler er_sde.
   */
  function buildMossWorkflow(opts) {
    const text = String(opts.prompt || "");
    const neg =
      opts.negative != null ? String(opts.negative) : MOSS.neg;
    const steps = Number(opts.steps) || MOSS.defaults.steps;
    const width = Math.max(16, Math.round((Number(opts.width) || MOSS.defaults.width) / 16) * 16);
    const height = Math.max(16, Math.round((Number(opts.height) || MOSS.defaults.height) / 16) * 16);
    const seed = Number(opts.seed) || 0;
    const cfg = opts.cfg != null ? Number(opts.cfg) : MOSS.defaults.cfg;
    const prefix = opts.prefix || "moss_" + seed;
    const useSlg = opts.slg !== false;

    const graph = {
      "1": {
        class_type: "UNETLoader",
        inputs: { unet_name: MOSS.unet, weight_dtype: "default" },
      },
      "2": {
        class_type: "CLIPLoader",
        inputs: { clip_name: MOSS.clip, type: "moss_image", device: "default" },
      },
      "3": {
        class_type: "VAELoader",
        inputs: { vae_name: MOSS.vae },
      },
      "4": {
        class_type: "CLIPTextEncode",
        inputs: { text: text, clip: ["2", 0] },
      },
      "5": {
        class_type: "CLIPTextEncode",
        inputs: { text: neg, clip: ["2", 0] },
      },
      "6": {
        class_type: "EmptyFlux2LatentImage",
        inputs: { width: width, height: height, batch_size: 1 },
      },
    };

    let modelRef = ["1", 0];
    if (useSlg) {
      graph["15"] = {
        class_type: "SkipLayerGuidanceDiTSimple",
        inputs: {
          model: ["1", 0],
          double_layers: "",
          single_layers: "22",
          start_percent: 0.0,
          end_percent: 0.5,
        },
      };
      modelRef = ["15", 0];
    }

    graph["7"] = {
      class_type: "KSampler",
      inputs: {
        seed: seed,
        steps: steps,
        cfg: cfg,
        sampler_name: "er_sde",
        scheduler: "simple",
        denoise: 1.0,
        model: modelRef,
        positive: ["4", 0],
        negative: ["5", 0],
        latent_image: ["6", 0],
      },
    };
    graph["8"] = {
      class_type: "VAEDecode",
      inputs: { samples: ["7", 0], vae: ["3", 0] },
    };
    graph["9"] = {
      class_type: "SaveImage",
      inputs: { filename_prefix: prefix, images: ["8", 0] },
    };
    return graph;
  }

  function buildSdxlCheckpointWorkflow(opts, preset) {
    const text = String(opts.prompt || "");
    const neg =
      opts.negative != null && String(opts.negative).length
        ? String(opts.negative)
        : preset.neg;
    const steps = Number(opts.steps) || preset.defaults.steps;
    const width = Number(opts.width) || preset.defaults.width;
    const height = Number(opts.height) || preset.defaults.height;
    const seed = Number(opts.seed) || 0;
    const cfg = opts.cfg != null ? Number(opts.cfg) : preset.defaults.cfg;
    const prefix = opts.prefix || preset.id + "_" + seed;
    const ckpt = opts.ckpt || preset.ckpt;

    return {
      "1": {
        class_type: "CheckpointLoaderSimple",
        inputs: { ckpt_name: ckpt },
      },
      "2": {
        class_type: "CLIPTextEncode",
        inputs: { text: text, clip: ["1", 1] },
      },
      "3": {
        class_type: "CLIPTextEncode",
        inputs: { text: neg, clip: ["1", 1] },
      },
      "4": {
        class_type: "EmptyLatentImage",
        inputs: { width: width, height: height, batch_size: 1 },
      },
      "5": {
        class_type: "KSampler",
        inputs: {
          seed: seed,
          steps: steps,
          cfg: cfg,
          sampler_name: "euler_ancestral",
          scheduler: "normal",
          denoise: 1.0,
          model: ["1", 0],
          positive: ["2", 0],
          negative: ["3", 0],
          latent_image: ["4", 0],
        },
      },
      "6": {
        class_type: "VAEDecode",
        inputs: { samples: ["5", 0], vae: ["1", 2] },
      },
      "7": {
        class_type: "SaveImage",
        inputs: { filename_prefix: prefix, images: ["6", 0] },
      },
    };
  }

  function getPreset(modelId) {
    return PRESETS[modelId] || LUSTIFY;
  }

  /**
   * @param {object} opts
   * @param {string} [opts.model] lustify|moss|wai|hassaku
   */
  function buildWorkflow(opts) {
    const model = String((opts && opts.model) || "lustify").toLowerCase();
    if (model === "moss") return buildMossWorkflow(opts || {});
    if (model === "wai") return buildSdxlCheckpointWorkflow(opts || {}, WAI);
    if (model === "hassaku") return buildSdxlCheckpointWorkflow(opts || {}, HASSAKU);
    return buildLustifyWorkflow(opts || {});
  }

  root.ComfyPhoneWorkflow = {
    PRESETS,
    LUSTIFY,
    MOSS,
    WAI,
    HASSAKU,
    DEFAULT_NEG: LUSTIFY.neg,
    getPreset,
    buildLustifyWorkflow,
    buildMossWorkflow,
    buildSdxlCheckpointWorkflow,
    buildWorkflow,
  };
})(typeof window !== "undefined" ? window : globalThis);
