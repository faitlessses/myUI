from backend.engines.ai_toolkit import build_ai_toolkit_command
from backend.engines.kohya_ss import build_kohya_command


def test_ai_toolkit_command_contains_config() -> None:
    cmd = build_ai_toolkit_command(
        python_bin="/usr/bin/python3",
        config_path="/workspace/config/train.yaml",
        override_command="",
    )
    assert "toolkit.train" in cmd or "ai_toolkit.train" in cmd
    assert "train.yaml" in cmd


def test_kohya_command_contains_required_flags() -> None:
    cmd = build_kohya_command(
        python_bin="/usr/bin/python3",
        train_script="train_network.py",
        dataset_path="/workspace/dataset",
        output_dir="/workspace/out",
        base_model="runwayml/stable-diffusion-v1-5",
        epochs=2,
        learning_rate=1e-4,
        batch_size=1,
        network_dim=64,
        network_alpha=32,
        mixed_precision="bf16",
        caption_dropout_rate=0.08,
        resume_checkpoint="/workspace/out/last.safetensors",
    )
    assert "train_network.py" in cmd
    assert "--train_data_dir" in cmd
    assert "--output_dir" in cmd
    assert "--network_dim 64" in cmd
    assert "--network_alpha 32" in cmd
    assert "--mixed_precision bf16" in cmd
    assert "--caption_dropout_rate 0.08" in cmd
    assert "--resume /workspace/out/last.safetensors" in cmd
