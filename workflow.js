/**
 * Phone page API workflow builders.
 * Lustify Krea Turbo (+图生图/局部重绘) / Moss Image bf16 + Qwen bf16 TE + full VAE / WAI & Hassaku (Illustrious SDXL) / Qwen PHOTOGRAPHY.
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


  const LUSTIFY_I2I = {
    id: "lustify_i2i",
    label: "Lustify 图生图",
    unet: LUSTIFY.unet,
    clip: LUSTIFY.clip,
    vae: LUSTIFY.vae,
    needsImage: true,
    needsMask: false,
    defaults: { steps: 20, cfg: 1.0, width: 1280, height: 2560, sampler: "euler", scheduler: "simple", denoise: 0.45 },
    neg: LUSTIFY.neg,
  };

  const LUSTIFY_INPAINT = {
    id: "lustify_inpaint",
    label: "Lustify 局部重绘",
    unet: LUSTIFY.unet,
    clip: LUSTIFY.clip,
    vae: LUSTIFY.vae,
    needsImage: true,
    needsMask: true,
    defaults: { steps: 20, cfg: 1.0, width: 1280, height: 2560, sampler: "euler", scheduler: "simple", denoise: 0.55 },
    neg: LUSTIFY.neg,
  };

  const MOSS = {
    id: "moss",
    label: "Moss Image bf16",
    unet: "moss_image_sft_bf16.safetensors",
    clip: "qwen3.5_9b_bf16.safetensors",
    vae: "flux2-vae.safetensors",
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

  const KREA2SVR = {
    id: "krea2svr",
    label: "Krea2 + SeedVR2 7B 放大",
    unet: "lustify-v10-krea-turbo-fp16.safetensors",
    clip: "qwen3vl_4b_bf16.safetensors", // fp8_scaled on 420 is truncated
    vae: "wan_2.1_vae.safetensors",
    lora: "Krea2-realism-V2.safetensors",
    loraStrength: 0.7,
    dit: "seedvr2_ema_7b_fp8_e4m3fn_mixed_block35_fp16.safetensors",
    svrVae: "ema_vae_fp16.safetensors",
    svrResolution: 1080,
    defaults: { steps: 8, cfg: 1.0, width: 1152, height: 1536, sampler: "euler", scheduler: "beta" },
    neg: "",
  };


  const PHOTOGRAPHY = {
    id: "photography",
    label: "千问 PHOTOGRAPHY",
    unet: "qwenIMAGEPHOTOGRAPHY_v10.safetensors",
    clip: "qwen_2.5_vl_7b.safetensors",
    vae: "qwen_image_vae.safetensors",
    defaults: { steps: 10, cfg: 1.0, width: 896, height: 1536, sampler: "res_2s", scheduler: "bong_tangent" },
    neg: "",
  };

  const PRESETS = { lustify: LUSTIFY, lustify_i2i: LUSTIFY_I2I, lustify_inpaint: LUSTIFY_INPAINT, moss: MOSS, wai: WAI, hassaku: HASSAKU, krea2svr: KREA2SVR, photography: PHOTOGRAPHY };

  /** Krea2_SeedVR2_7B_FP8: Krea2 first pass (+realism LoRA) -> SeedVR2 7B FP8 upscale. Muted IPAdapter/CN/LayerStyle/compile nodes omitted. */
  function buildKrea2SeedVR2Workflow(opts) {
    const P = KREA2SVR;
    const text = String(opts.prompt || "");
    const neg = opts.negative != null ? String(opts.negative).trim() : "";
    const steps = Number(opts.steps) || P.defaults.steps;
    const width = Math.round((Number(opts.width) || P.defaults.width) / 16) * 16;
    const height = Math.round((Number(opts.height) || P.defaults.height) / 16) * 16;
    const seed = Number(opts.seed) || 0;
    const cfg = opts.cfg != null ? Number(opts.cfg) : P.defaults.cfg;
    const prefix = opts.prefix || "krea2svr_" + seed;
    const g = {
      "1": { class_type: "UNETLoader", inputs: { unet_name: P.unet, weight_dtype: "default" } },
      "2": { class_type: "CLIPLoader", inputs: { clip_name: P.clip, type: "krea2", device: "default" } },
      "3": { class_type: "VAELoader", inputs: { vae_name: P.vae } },
      "11": { class_type: "LoraLoaderModelOnly", inputs: { model: ["1", 0], lora_name: P.lora, strength_model: P.loraStrength } },
      "4": { class_type: "ModelSamplingAuraFlow", inputs: { model: ["11", 0], shift: 4.0 } },
      "5": { class_type: "CLIPTextEncode", inputs: { text: text, clip: ["2", 0] } },
      "7": { class_type: "EmptyLatentImage", inputs: { width: width, height: height, batch_size: 1 } },
      "8": {
        class_type: "KSampler",
        inputs: {
          seed: seed, steps: steps, cfg: cfg, sampler_name: "euler", scheduler: "beta", denoise: 1.0,
          model: ["4", 0], positive: ["5", 0], negative: ["6", 0], latent_image: ["7", 0],
        },
      },
      "9": { class_type: "VAEDecode", inputs: { samples: ["8", 0], vae: ["3", 0] } },
      "20": {
        class_type: "SeedVR2LoadDiTModel",
        inputs: { model: P.dit, device: "cuda:0", blocks_to_swap: 0, swap_io_components: false, offload_device: "none", cache_model: false, attention_mode: "sdpa" },
      },
      "21": {
        class_type: "SeedVR2LoadVAEModel",
        inputs: { model: P.svrVae, device: "cuda:0", encode_tiled: false, encode_tile_size: 1024, encode_tile_overlap: 128, decode_tiled: false, decode_tile_size: 1024, decode_tile_overlap: 128, tile_debug: "false", offload_device: "none", cache_model: false },
      },
      "22": {
        class_type: "SeedVR2VideoUpscaler",
        inputs: {
          image: ["9", 0], dit: ["20", 0], vae: ["21", 0], seed: seed % 4294967296, resolution: P.svrResolution, max_resolution: 0,
          batch_size: 1, uniform_batch_size: false, color_correction: "lab", temporal_overlap: 0, prepend_frames: 0,
          input_noise_scale: 0, latent_noise_scale: 0, offload_device: "cpu", enable_debug: false,
        },
      },
      "10": { class_type: "SaveImage", inputs: { filename_prefix: prefix, images: ["22", 0] } },
    };
    if (neg) g["6"] = { class_type: "CLIPTextEncode", inputs: { text: neg, clip: ["2", 0] } };
    else g["6"] = { class_type: "ConditioningZeroOut", inputs: { conditioning: ["5", 0] } };
    return g;
  }

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


  /**
   * Qwen-Image PHOTOGRAPHY_STYLE NSFW (author defaults: res_2s / bong_tangent / 10 / CFG1 / ~896x1536).
   * No Lightning / NSFW LoRAs. Prompt via TextEncodeQwenImageEditPlus; neg = ConditioningZeroOut.
   */
  function buildPhotographyWorkflow(opts) {
    const P = PHOTOGRAPHY;
    const text = String(opts.prompt || "");
    const steps = Number(opts.steps) || P.defaults.steps;
    const width = Math.max(16, Math.round((Number(opts.width) || P.defaults.width) / 16) * 16);
    const height = Math.max(16, Math.round((Number(opts.height) || P.defaults.height) / 16) * 16);
    const seed = Number(opts.seed) || 0;
    const cfg = opts.cfg != null ? Number(opts.cfg) : P.defaults.cfg;
    const sampler = (opts.sampler != null && String(opts.sampler)) || P.defaults.sampler;
    const scheduler = (opts.scheduler != null && String(opts.scheduler)) || P.defaults.scheduler;
    const prefix = opts.prefix || "photography_" + seed;

    return {
      "1": {
        class_type: "UNETLoader",
        inputs: { unet_name: P.unet, weight_dtype: "default" },
      },
      "2": {
        class_type: "CLIPLoader",
        inputs: { clip_name: P.clip, type: "qwen_image", device: "default" },
      },
      "3": {
        class_type: "VAELoader",
        inputs: { vae_name: P.vae },
      },
      "4": {
        class_type: "TextEncodeQwenImageEditPlus",
        inputs: { clip: ["2", 0], prompt: text },
      },
      "5": {
        class_type: "ConditioningZeroOut",
        inputs: { conditioning: ["4", 0] },
      },
      "6": {
        class_type: "EmptyLatentImage",
        inputs: { width: width, height: height, batch_size: 1 },
      },
      "7": {
        class_type: "KSampler",
        inputs: {
          seed: seed,
          steps: steps,
          cfg: cfg,
          sampler_name: sampler,
          scheduler: scheduler,
          denoise: 1.0,
          model: ["1", 0],
          positive: ["4", 0],
          negative: ["5", 0],
          latent_image: ["6", 0],
        },
      },
      "8": {
        class_type: "VAEDecode",
        inputs: { samples: ["7", 0], vae: ["3", 0] },
      },
      "9": {
        class_type: "SaveImage",
        inputs: { filename_prefix: prefix, images: ["8", 0] },
      },
    };
  }


  /**
   * Lustify img2img: same UNET/CLIP/VAE stack as text2img, LoadImage -> VAEEncode -> KSampler(denoise).
   * opts.imageName = filename already on Comfy input/ via /upload/image
   * opts.denoise default 0.45
   */
  function buildLustifyImg2ImgWorkflow(opts) {
    const text = String(opts.prompt || "");
    const neg =
      opts.negative != null && String(opts.negative).length
        ? String(opts.negative)
        : LUSTIFY_I2I.neg;
    const steps = Number(opts.steps) || LUSTIFY_I2I.defaults.steps;
    const seed = Number(opts.seed) || 0;
    const cfg = opts.cfg != null ? Number(opts.cfg) : LUSTIFY_I2I.defaults.cfg;
    const denoise = opts.denoise != null ? Number(opts.denoise) : LUSTIFY_I2I.defaults.denoise;
    const prefix = opts.prefix || "lustify_i2i_" + seed;
    const imageName = String(opts.imageName || "").trim();
    if (!imageName) throw new Error("图生图需要先上传参考图");

    return {
      "1": { class_type: "UNETLoader", inputs: { unet_name: LUSTIFY.unet, weight_dtype: "default" } },
      "2": { class_type: "CLIPLoader", inputs: { clip_name: LUSTIFY.clip, type: "krea2", device: "default" } },
      "3": { class_type: "VAELoader", inputs: { vae_name: LUSTIFY.vae } },
      "4": { class_type: "ModelSamplingAuraFlow", inputs: { model: ["1", 0], shift: 4.0, sampling: "flow" } },
      "5": { class_type: "CLIPTextEncode", inputs: { text: text, clip: ["2", 0] } },
      "6": { class_type: "CLIPTextEncode", inputs: { text: neg, clip: ["2", 0] } },
      "11": { class_type: "LoadImage", inputs: { image: imageName } },
      "12": { class_type: "VAEEncode", inputs: { pixels: ["11", 0], vae: ["3", 0] } },
      "8": {
        class_type: "KSampler",
        inputs: {
          seed: seed, steps: steps, cfg: cfg, sampler_name: "euler", scheduler: "simple",
          denoise: denoise, model: ["4", 0], positive: ["5", 0], negative: ["6", 0], latent_image: ["12", 0],
        },
      },
      "9": { class_type: "VAEDecode", inputs: { samples: ["8", 0], vae: ["3", 0] } },
      "10": { class_type: "SaveImage", inputs: { filename_prefix: prefix, images: ["9", 0] } },
    };
  }

  /**
   * Lustify masked inpaint. Needs imageName + maskName on Comfy input/.
   * Mask: white = redraw. Phone page has no MaskEditor — upload a B/W mask or use desktop Comfy.
   * opts.denoise default 0.55; grow_mask_by default 8.
   */
  function buildLustifyInpaintWorkflow(opts) {
    const text = String(opts.prompt || "");
    const neg =
      opts.negative != null && String(opts.negative).length
        ? String(opts.negative)
        : LUSTIFY_INPAINT.neg;
    const steps = Number(opts.steps) || LUSTIFY_INPAINT.defaults.steps;
    const seed = Number(opts.seed) || 0;
    const cfg = opts.cfg != null ? Number(opts.cfg) : LUSTIFY_INPAINT.defaults.cfg;
    const denoise = opts.denoise != null ? Number(opts.denoise) : LUSTIFY_INPAINT.defaults.denoise;
    const grow = opts.growMask != null ? Number(opts.growMask) : 8;
    const prefix = opts.prefix || "lustify_inpaint_" + seed;
    const imageName = String(opts.imageName || "").trim();
    const maskName = String(opts.maskName || "").trim();
    if (!imageName) throw new Error("局部重绘需要先上传原图");
    if (!maskName) throw new Error("局部重绘需要蒙版图（白=重画）。手机无涂抹：用电脑 Comfy 打开 Lustify_detail_inpaint.json，或另传黑白蒙版 PNG");

    return {
      "1": { class_type: "UNETLoader", inputs: { unet_name: LUSTIFY.unet, weight_dtype: "default" } },
      "2": { class_type: "CLIPLoader", inputs: { clip_name: LUSTIFY.clip, type: "krea2", device: "default" } },
      "3": { class_type: "VAELoader", inputs: { vae_name: LUSTIFY.vae } },
      "4": { class_type: "ModelSamplingAuraFlow", inputs: { model: ["1", 0], shift: 4.0, sampling: "flow" } },
      "5": { class_type: "CLIPTextEncode", inputs: { text: text, clip: ["2", 0] } },
      "6": { class_type: "CLIPTextEncode", inputs: { text: neg, clip: ["2", 0] } },
      "11": { class_type: "LoadImage", inputs: { image: imageName } },
      "13": { class_type: "LoadImage", inputs: { image: maskName } },
      "14": { class_type: "ImageToMask", inputs: { image: ["13", 0], channel: "red" } },
      "12": {
        class_type: "VAEEncodeForInpaint",
        inputs: { pixels: ["11", 0], vae: ["3", 0], mask: ["14", 0], grow_mask_by: grow },
      },
      "8": {
        class_type: "KSampler",
        inputs: {
          seed: seed, steps: steps, cfg: cfg, sampler_name: "euler", scheduler: "simple",
          denoise: denoise, model: ["4", 0], positive: ["5", 0], negative: ["6", 0], latent_image: ["12", 0],
        },
      },
      "9": { class_type: "VAEDecode", inputs: { samples: ["8", 0], vae: ["3", 0] } },
      "10": { class_type: "SaveImage", inputs: { filename_prefix: prefix, images: ["9", 0] } },
    };
  }

  function getPreset(modelId) {
    return PRESETS[modelId] || LUSTIFY;
  }

  /**
   * @param {object} opts
   * @param {string} [opts.model] lustify|lustify_i2i|lustify_inpaint|moss|wai|hassaku|krea2svr|photography
   */
  function buildWorkflow(opts) {
    const model = String((opts && opts.model) || "lustify").toLowerCase();
    if (model === "lustify_i2i") return buildLustifyImg2ImgWorkflow(opts || {});
    if (model === "lustify_inpaint") return buildLustifyInpaintWorkflow(opts || {});
    if (model === "krea2svr") return buildKrea2SeedVR2Workflow(opts || {});
    if (model === "photography") return buildPhotographyWorkflow(opts || {});
    if (model === "moss") return buildMossWorkflow(opts || {});
    if (model === "wai") return buildSdxlCheckpointWorkflow(opts || {}, WAI);
    if (model === "hassaku") return buildSdxlCheckpointWorkflow(opts || {}, HASSAKU);
    return buildLustifyWorkflow(opts || {});
  }

  root.ComfyPhoneWorkflow = {
    PRESETS,
    LUSTIFY,
    LUSTIFY_I2I,
    LUSTIFY_INPAINT,
    MOSS,
    WAI,
    HASSAKU,
    KREA2SVR,
    PHOTOGRAPHY,
    buildKrea2SeedVR2Workflow,
    buildPhotographyWorkflow,
    buildLustifyImg2ImgWorkflow,
    buildLustifyInpaintWorkflow,
    DEFAULT_NEG: LUSTIFY.neg,
    getPreset,
    buildLustifyWorkflow,
    buildMossWorkflow,
    buildSdxlCheckpointWorkflow,
    buildWorkflow,
  };
})(typeof window !== "undefined" ? window : globalThis);
