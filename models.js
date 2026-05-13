const MODEL_CATEGORIES = [
    {
        name: "Text Models",
        models: [
            {
                id: "inclusionai/ring-2.6-1t:free",
                name: "Ring 2.6 (1T)",
                provider: "InclusionAI / OpenRouter",
                type: "chat",
                pricing: "free"
            },
            {
                id: "baidu/cobuddy:free",
                name: "CoBuddy",
                provider: "Baidu / OpenRouter",
                type: "chat",
                pricing: "free"
            },
            {
                id: "google/gemma-4-31b-it:free",
                name: "Gemma 4 (31B)",
                provider: "Google / OpenRouter",
                type: "chat",
                pricing: "free"
            },
            {
                id: "minimax/minimax-m2.5:free",
                name: "MiniMax M2.5",
                provider: "MiniMax / OpenRouter",
                type: "chat",
                pricing: "free"
            }
        ]
    },
    {
        name: "Embedding Models",
        models: [
            {
                id: "nvidia/llama-nemotron-embed-vl-1b-v2:free",
                name: "NVIDIA Nemotron (Embed)",
                provider: "NVIDIA / OpenRouter",
                type: "embed",
                pricing: "free"
            }
        ]
    },
    {
        name: "Code Models",
        models: [] // Empty for now
    },
    {
        name: "Image Models",
        models: [
            {
                id: "black-forest-labs/flux.2-klein-4b",
                name: "Flux.2 Klein 4B",
                provider: "Black Forest Labs / OpenRouter",
                type: "image",
                pricing: "free"
            },
            {
                id: "black-forest-labs/flux.2-pro",
                name: "Flux.2 Pro",
                provider: "Black Forest Labs / OpenRouter",
                type: "image",
                pricing: "free"
            },
            {
                id: "sourceful/riverflow-v2-fast",
                name: "Riverflow V2 Fast",
                provider: "Sourceful / OpenRouter",
                type: "image",
                pricing: "free"
            }
        ]
    },
    {
        name: "Video Models",
        models: [
            {
                id: "google/veo-3.1-lite",
                name: "Veo 3.1 Lite",
                provider: "Google / OpenRouter",
                type: "video",
                pricing: "paid"
            }
        ]
    }
];
