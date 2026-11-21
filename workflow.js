/**
 * Phone page API workflow builders.
 * Lustify Krea Turbo (+图生图/局部重绘) / Moss Image bf16 + Qwen bf16 TE + full VAE / WAI & Hassaku (Illustrious SDXL) / Qwen PHOTOGRAPHY / Moody Krea2 典藏版 V9 BF16 / Moody Krea2 Simple V5.
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

  // 398 data disk keeps this BF16 file in models/checkpoints (Comfy ckpt name, not a host path).
  // Encoder + VAE are the official Krea 2 companions in text_encoders/ and vae/.
  const MOODY_V9 = {
    id: "moody_v9",
    label: "Moody Krea2 典藏版 V9 BF16",
    ckpt: "Moody-Krea2-Mix-CollectorEdition_00001__clean.safetensors",
    clip: "qwen3vl_4b_bf16.safetensors",
    vae: "qwen_image_vae.safetensors",
    defaults: { steps: 8, cfg: 1.0, width: 1024, height: 1536, sampler: "euler_ancestral", scheduler: "beta" },
    neg: "",
  };

  // Source graph: workflows/Moody_Krea2_Simple_V5.json.
  // EmptyLatentImage is the base (640×960). ResolutionSelector (2:3 / 2.8 MP) has no links.
  // Final pixels = round(base/8 × 1.7) × 8 × 2 → 2176×3264 at the default.
  // Checkpoint is on models/checkpoints. CLIP type krea2. VAE unchanged.
  // Skin contrast model stays the graph filename. SeedVR2 weights + 4x Nomos are on the shared disk.
  const MOODY_V5 = {
    id: "moody_v5",
    label: "Moody Krea2 Simple V5",
    ckpt: "Moody-Krea2-Mix-CollectorEdition_00001__clean.safetensors",
    clip: "qwen3vl_4b_bf16.safetensors",
    vae: "qwen_image_vae.safetensors",
    upscaler: "4xNomosWebPhoto_RealPLKSR.pth",
    skin: "1xSkinContrast-High-SuperUltraCompact.pth",
    latentScale: 1.7,
    sdScale: 2,
    dit: "seedvr2_ema_7b_sharp_fp16.safetensors",
    svrVae: "ema_vae_fp16.safetensors",
    autoDetailPrompt: "Person， yanni, cute girl",
    manualDetailPrompt: "close-up, labia spread open by both hands, clitoris visible, urethral opening visible, vaginal opening visible, frontal view",
    defaults: { steps: 30, cfg: 1.0, width: 640, height: 960, sampler: "er_sde", scheduler: "beta" },
    neg: "",
  };

  const PRESETS = { lustify: LUSTIFY, lustify_i2i: LUSTIFY_I2I, lustify_inpaint: LUSTIFY_INPAINT, moss: MOSS, wai: WAI, hassaku: HASSAKU, krea2svr: KREA2SVR, photography: PHOTOGRAPHY, moody_v9: MOODY_V9, moody_v5: MOODY_V5 };

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
   * Moody Krea 2 Mix Collector's Edition V9 BF16.
   * Checkpoint lives in models/checkpoints, so CheckpointLoaderSimple (MODEL only).
   * Official encoder via CLIPLoader type=krea2 and qwen_image_vae via VAELoader.
   * Author defaults for the mix: Euler A / beta / 8 steps / CFG 1. Empty negative uses ConditioningZeroOut.
   */
  function buildMoodyV9Workflow(opts) {
    const P = MOODY_V9;
    const text = String(opts.prompt || "");
    const neg = opts.negative != null ? String(opts.negative).trim() : "";
    const steps = Number(opts.steps) || P.defaults.steps;
    const width = Math.max(16, Math.round((Number(opts.width) || P.defaults.width) / 16) * 16);
    const height = Math.max(16, Math.round((Number(opts.height) || P.defaults.height) / 16) * 16);
    const seed = Number(opts.seed) || 0;
    const cfg = opts.cfg != null ? Number(opts.cfg) : P.defaults.cfg;
    const sampler = (opts.sampler != null && String(opts.sampler)) || P.defaults.sampler;
    const scheduler = (opts.scheduler != null && String(opts.scheduler)) || P.defaults.scheduler;
    const prefix = opts.prefix || "moody_v9_" + seed;
    const ckpt = opts.ckpt || P.ckpt;
    const g = {
      "1": {
        class_type: "CheckpointLoaderSimple",
        inputs: { ckpt_name: ckpt },
      },
      "2": {
        class_type: "CLIPLoader",
        inputs: { clip_name: P.clip, type: "krea2", device: "default" },
      },
      "3": {
        class_type: "VAELoader",
        inputs: { vae_name: P.vae },
      },
      "5": {
        class_type: "CLIPTextEncode",
        inputs: { text: text, clip: ["2", 0] },
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
          sampler_name: sampler,
          scheduler: scheduler,
          denoise: 1.0,
          model: ["1", 0],
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
    if (neg) g["6"] = { class_type: "CLIPTextEncode", inputs: { text: neg, clip: ["2", 0] } };
    else g["6"] = { class_type: "ConditioningZeroOut", inputs: { conditioning: ["5", 0] } };
    return g;
  }

  /** Frontend SaveImage date tokens, expanded the way the V5 graph queues them. */
  function expandComfyDatePrefix(prefix, date) {
    const d = date || new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const tokens = {
      yyyy: String(d.getFullYear()),
      MM: pad(d.getMonth() + 1),
      dd: pad(d.getDate()),
      hh: pad(d.getHours()),
      mm: pad(d.getMinutes()),
      ss: pad(d.getSeconds()),
    };
    return String(prefix).replace(/%date:([^%]+)%/g, function (_, fmt) {
      return fmt.replace(/yyyy|MM|dd|hh|mm|ss/g, function (t) { return tokens[t] || t; });
    });
  }

  /**
   * Pixel size after LatentUpscaleBy (scale on the latent grid) and UltimateSDUpscale.
   * Default 640×960 → latent 1088×1632 → final 2176×3264.
   */
  function moodyV5OutputSize(width, height) {
    const P = MOODY_V5;
    const w = Math.max(64, Math.round((Number(width) || P.defaults.width) / 8) * 8);
    const h = Math.max(64, Math.round((Number(height) || P.defaults.height) / 8) * 8);
    const latW = Math.max(1, Math.round((w / 8) * P.latentScale));
    const latH = Math.max(1, Math.round((h / 8) * P.latentScale));
    return {
      width: w,
      height: h,
      latentWidth: latW * 8,
      latentHeight: latH * 8,
      finalWidth: latW * 8 * P.sdScale,
      finalHeight: latH * 8 * P.sdScale,
    };
  }

  /**
   * Moody Krea2 Simple Workflow V5 as a Comfy API prompt.
   * Node ids match workflows/Moody_Krea2_Simple_V5.json.
   * Bypassed nodes (mode 4) are left out, the same way Comfy queues that graph:
   * both DetailerForEach and the SeedVR2 group.
   * opts.seedvr / opts.autoDetail / opts.manualDetail put those optional branches back.
   * LatentUpscaleBy (1.7, bicubic) and the skin-contrast upscale are enabled.
   * Virtual nodes (Set/Get, Reroute, Seed rgthree, notes, comparers, bypassers) are resolved away.
   * Second KSampler denoise stays 0, as stored on node 842.
   * CLIPTextEncode uses the page prompt, not the sample text stored on node 627.
   */
  function buildMoodyV5Workflow(opts) {
    const P = MOODY_V5;
    opts = opts || {};
    const text = String(opts.prompt || "");
    const neg = opts.negative != null ? String(opts.negative).trim() : "";
    const steps = Number(opts.steps) || P.defaults.steps;
    const cfg = opts.cfg != null && opts.cfg !== "" ? Number(opts.cfg) : P.defaults.cfg;
    const seed = Number.isFinite(Number(opts.seed)) ? Math.round(Number(opts.seed)) : 0;
    const size = moodyV5OutputSize(opts.width, opts.height);
    const width = size.width;
    const height = size.height;
    const seedvr = opts.seedvr === true;
    const autoDetail = opts.autoDetail === true;
    const manualDetail = opts.manualDetail === true;
    const maskName = String(opts.maskName || "").trim();
    if (manualDetail && !maskName) throw new Error("手动重绘需要蒙版图（白=重画）");
    const autoPrompt = String(opts.autoDetailPrompt || "").trim() || P.autoDetailPrompt;
    const manualPrompt = String(opts.manualDetailPrompt || "").trim() || P.manualDetailPrompt;
    const stamped = opts.now instanceof Date ? opts.now : new Date();
    const savePrefix = expandComfyDatePrefix("image/%date:yyyy-MM-dd%/Krea2-%date:hhmmss%", stamped);
    const seedvrPrefix = expandComfyDatePrefix("image/%date:yyyy-MM-dd%/Krea2-SEEDVR-%date:hhmmss%", stamped);

    const g = {
      "865": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: opts.ckpt || P.ckpt } },
      "866": {
        class_type: "CLIPLoader",
        inputs: { clip_name: P.clip, type: "krea2", device: "default" },
      },
      "869": { class_type: "VAELoader", inputs: { vae_name: P.vae } },
      "867": {
        class_type: "ModelAttentionBackend",
        inputs: { model: ["865", 0], attention: "comfy kitchen attention" },
      },
      "873": {
        class_type: "Power Lora Loader (rgthree)",
        inputs: {
          model: ["867", 0],
          PowerLoraLoaderHeaderWidget: { type: "PowerLoraLoaderHeaderWidget" },
        },
      },
      "627": { class_type: "CLIPTextEncode", inputs: { text: text, clip: ["866", 0] } },
      "773": { class_type: "PrimitiveInt", inputs: { value: 40 } },
      "775": { class_type: "PrimitiveInt", inputs: { value: 0 } },
      "771": { class_type: "SimpleMath+", inputs: { a: seed, b: ["773", 0], value: "a+b" } },
      "774": { class_type: "SimpleMath+", inputs: { a: ["775", 0], b: ["771", 0], value: "a+b" } },
      "599": {
        class_type: "KSamplerAdvanced",
        inputs: {
          model: ["873", 0],
          add_noise: "enable",
          noise_seed: seed,
          steps: steps,
          cfg: cfg,
          sampler_name: "er_sde",
          scheduler: "beta",
          positive: ["627", 0],
          negative: ["763", 0],
          latent_image: ["698", 0],
          start_at_step: 0,
          end_at_step: steps,
          return_with_leftover_noise: "disable",
        },
      },
      "842": {
        class_type: "KSampler",
        inputs: {
          model: ["873", 0],
          seed: ["771", 0],
          steps: 4,
          cfg: 1,
          sampler_name: "euler_ancestral",
          scheduler: "beta",
          positive: ["627", 0],
          negative: ["763", 0],
          latent_image: ["647", 0],
          denoise: 0,
        },
      },
      "647": {
        class_type: "LatentUpscaleBy",
        inputs: {
          samples: ["599", 0],
          upscale_method: "bicubic",
          scale_by: P.latentScale,
        },
      },
      "609": { class_type: "VAEDecode", inputs: { samples: ["599", 0], vae: ["869", 0] } },
      "610": { class_type: "VAEDecode", inputs: { samples: ["842", 0], vae: ["869", 0] } },
      "832": {
        class_type: "ColorMatch",
        inputs: {
          image_ref: ["609", 0],
          image_target: ["610", 0],
          method: "hm-mkl-hm",
          strength: 0.22,
          multithread: true,
        },
      },
      "644": { class_type: "UpscaleModelLoader", inputs: { model_name: P.upscaler } },
      "637": { class_type: "FloatConstant", inputs: { value: P.sdScale } },
      "618": { class_type: "GetImageSize", inputs: { image: ["832", 0] } },
      "630": {
        class_type: "SimpleMath+",
        inputs: { a: ["618", 1], b: ["637", 0], value: "(a*b + (96 * 2))/2" },
      },
      "631": {
        class_type: "SimpleMath+",
        inputs: { a: ["618", 0], b: ["637", 0], value: "(a*b + (96 * 2))/2" },
      },
      "663": {
        class_type: "UltimateSDUpscale",
        inputs: {
          image: ["832", 0],
          model: ["873", 0],
          positive: ["627", 0],
          negative: ["763", 0],
          vae: ["869", 0],
          upscale_model: ["644", 0],
          upscale_by: ["637", 0],
          seed: ["774", 0],
          steps: 4,
          cfg: 1,
          sampler_name: "euler_ancestral",
          scheduler: "beta",
          denoise: 0.2,
          mode_type: "Linear",
          tile_width: ["631", 0],
          tile_height: ["630", 0],
          mask_blur: 64,
          tile_padding: 96,
          seam_fix_mode: "None",
          seam_fix_denoise: 1,
          seam_fix_width: 64,
          seam_fix_mask_blur: 8,
          seam_fix_padding: 16,
          force_uniform_tiles: true,
          tiled_decode: false,
        },
      },
    };

    g["698"] = {
      class_type: "EmptyLatentImage",
      inputs: { width: width, height: height, batch_size: 1 },
    };

    if (neg) g["763"] = { class_type: "CLIPTextEncode", inputs: { text: neg, clip: ["866", 0] } };
    else g["763"] = { class_type: "ConditioningZeroOut", inputs: { conditioning: ["627", 0] } };

    let imageRef = ["663", 0];

    if (autoDetail) {
      g["884"] = {
        class_type: "Power Lora Loader (rgthree)",
        inputs: {
          model: ["867", 0],
          PowerLoraLoaderHeaderWidget: { type: "PowerLoraLoaderHeaderWidget" },
        },
      };
      g["892"] = { class_type: "CLIPTextEncode", inputs: { text: autoPrompt, clip: ["866", 0] } };
      g["745"] = { class_type: "ConditioningZeroOut", inputs: { conditioning: ["892", 0] } };
      g["893"] = {
        class_type: "UltralyticsDetectorProvider",
        inputs: { model_name: "bbox/face_yolov8m.pt" },
      };
      g["899"] = {
        class_type: "BboxDetectorSEGS",
        inputs: {
          bbox_detector: ["893", 0],
          image: ["663", 0],
          threshold: 0.5,
          dilation: 10,
          crop_factor: 2.2,
          drop_size: 1,
          labels: "all",
        },
      };
      g["915"] = {
        class_type: "ImpactSEGSOrderedFilter",
        inputs: {
          segs: ["899", 0],
          target: "confidence",
          order: true,
          take_start: 0,
          take_count: 1,
        },
      };
      g["887"] = {
        class_type: "DetailerForEach",
        inputs: {
          image: ["663", 0],
          segs: ["915", 0],
          model: ["884", 0],
          clip: ["866", 0],
          vae: ["869", 0],
          positive: ["892", 0],
          negative: ["745", 0],
          seed: seed,
          guide_size: 1440,
          guide_size_for: true,
          max_size: 1440,
          steps: 6,
          cfg: 1,
          sampler_name: "euler_ancestral",
          scheduler: "beta",
          denoise: 0.35,
          feather: 100,
          noise_mask: true,
          force_inpaint: true,
          wildcard: "",
          cycle: 1,
          inpaint_model: false,
          noise_mask_feather: 20,
          tiled_encode: false,
          tiled_decode: false,
        },
      };
      imageRef = ["887", 0];
    }

    if (manualDetail) {
      g["707"] = {
        class_type: "Power Lora Loader (rgthree)",
        inputs: {
          model: ["867", 0],
          PowerLoraLoaderHeaderWidget: { type: "PowerLoraLoaderHeaderWidget" },
          lora_1: {
            on: false,
            lora: "krea2\\MysticXXX_KREA2_v3.safetensors",
            strength: 0.4,
            strengthTwo: null,
          },
          lora_2: {
            on: false,
            lora: "krea2\\moody_girl_krea2_v4_000002500.safetensors",
            strength: 0.4800048828125001,
            strengthTwo: null,
          },
          lora_3: {
            on: true,
            lora: "krea2\\saltaro krea2_pussy_inpainting_lora_v1.0.safetensors",
            strength: 0.5999999999999999,
            strengthTwo: null,
          },
        },
      };
      g["904"] = { class_type: "CLIPTextEncode", inputs: { text: manualPrompt, clip: ["866", 0] } };
      g["918"] = { class_type: "ConditioningZeroOut", inputs: { conditioning: ["904", 0] } };
      g["11"] = { class_type: "LoadImage", inputs: { image: maskName } };
      g["14"] = { class_type: "ImageToMask", inputs: { image: ["11", 0], channel: "red" } };
      g["900"] = { class_type: "ImpactDilateMask", inputs: { mask: ["14", 0], dilation: 8 } };
      g["905"] = {
        class_type: "MaskToSEGS",
        inputs: {
          mask: ["900", 0],
          combined: false,
          crop_factor: 6.1,
          bbox_fill: false,
          drop_size: 10,
          contour_fill: true,
        },
      };
      g["916"] = {
        class_type: "DetailerForEach",
        inputs: {
          image: imageRef,
          segs: ["905", 0],
          model: ["707", 0],
          clip: ["866", 0],
          vae: ["869", 0],
          positive: ["904", 0],
          negative: ["918", 0],
          seed: seed,
          guide_size: 1440,
          guide_size_for: true,
          max_size: 1410.9091796875,
          steps: 8,
          cfg: 1,
          sampler_name: "euler_ancestral",
          scheduler: "beta",
          denoise: 0.45,
          feather: 100,
          noise_mask: true,
          force_inpaint: true,
          wildcard: "",
          cycle: 1,
          inpaint_model: false,
          noise_mask_feather: 100,
          tiled_encode: false,
          tiled_decode: false,
        },
      };
      imageRef = ["916", 0];
    }

    // Skin contrast is enabled: 1x model into ImageBlend image2, SaveImage takes the blend.
    g["924"] = {
      class_type: "UpscaleModelLoader",
      inputs: { model_name: P.skin },
    };
    g["925"] = {
      class_type: "ImageUpscaleWithModel",
      inputs: { upscale_model: ["924", 0], image: imageRef },
    };
    g["923"] = {
      class_type: "ImageBlend",
      inputs: {
        image1: imageRef,
        image2: ["925", 0],
        blend_factor: 0.2,
        blend_mode: "normal",
      },
    };
    g["732"] = {
      class_type: "SaveImage",
      inputs: { images: ["923", 0], filename_prefix: savePrefix },
    };

    if (seedvr) {
      g["874"] = { class_type: "UpscaleModelLoader", inputs: { model_name: P.upscaler } };
      g["929"] = {
        class_type: "SeedVR2LoadDiTModel",
        inputs: {
          model: P.dit,
          device: "cuda:0",
          blocks_to_swap: 36,
          swap_io_components: false,
          offload_device: "cpu",
          cache_model: false,
          attention_mode: "sageattn_3",
        },
      };
      g["931"] = {
        class_type: "SeedVR2LoadVAEModel",
        inputs: {
          model: P.svrVae,
          device: "cuda:0",
          encode_tiled: true,
          encode_tile_size: 1024,
          encode_tile_overlap: 128,
          decode_tiled: true,
          decode_tile_size: 1024,
          decode_tile_overlap: 128,
          tile_debug: "false",
          offload_device: "cpu",
          cache_model: false,
        },
      };
      g["933"] = {
        class_type: "SeedVR2VideoUpscaler",
        inputs: {
          image: ["923", 0],
          dit: ["929", 0],
          vae: ["931", 0],
          seed: 1234567890,
          resolution: Math.min(size.finalWidth, size.finalHeight),
          max_resolution: Math.max(size.finalWidth, size.finalHeight),
          batch_size: 1,
          uniform_batch_size: false,
          color_correction: "lab",
          temporal_overlap: 0,
          prepend_frames: 0,
          input_noise_scale: 0,
          latent_noise_scale: 0,
          offload_device: "cpu",
          enable_debug: false,
        },
      };
      g["939"] = {
        class_type: "ImageUpscaleWithModel",
        inputs: { upscale_model: ["874", 0], image: ["923", 0] },
      };
      g["936"] = { class_type: "GetImageSize", inputs: { image: ["933", 0] } };
      g["938"] = {
        class_type: "ImageScale",
        inputs: {
          image: ["939", 0],
          upscale_method: "lanczos",
          width: ["936", 0],
          height: ["936", 1],
          crop: "disabled",
        },
      };
      g["934"] = {
        class_type: "ImageBlend",
        inputs: {
          image1: ["933", 0],
          image2: ["938", 0],
          blend_factor: 0.4,
          blend_mode: "normal",
        },
      };
      g["954"] = {
        class_type: "SaveImage",
        inputs: { images: ["934", 0], filename_prefix: seedvrPrefix },
      };
    }

    return g;
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
   * @param {string} [opts.model] lustify|lustify_i2i|lustify_inpaint|moss|wai|hassaku|krea2svr|photography|moody_v9|moody_v5
   */
  function buildWorkflow(opts) {
    const model = String((opts && opts.model) || "lustify").toLowerCase();
    if (model === "lustify_i2i") return buildLustifyImg2ImgWorkflow(opts || {});
    if (model === "lustify_inpaint") return buildLustifyInpaintWorkflow(opts || {});
    if (model === "krea2svr") return buildKrea2SeedVR2Workflow(opts || {});
    if (model === "photography") return buildPhotographyWorkflow(opts || {});
    if (model === "moody_v9") return buildMoodyV9Workflow(opts || {});
    if (model === "moody_v5") return buildMoodyV5Workflow(opts || {});
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
    MOODY_V9,
    MOODY_V5,
    buildKrea2SeedVR2Workflow,
    buildPhotographyWorkflow,
    buildMoodyV9Workflow,
    buildMoodyV5Workflow,
    moodyV5OutputSize,
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
