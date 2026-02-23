from __future__ import annotations


def build_kohya_command(
    python_bin: str,
    train_script: str,
    dataset_path: str,
    output_dir: str,
    base_model: str,
    epochs: int,
    learning_rate: float,
    batch_size: int,
    network_dim: int = 32,
    network_alpha: int = 16,
    mixed_precision: str = "bf16",
    caption_dropout_rate: float = 0.05,
    resume_checkpoint: str = "",
) -> str:
    command = (
        f"{python_bin} {train_script} "
        f"--pretrained_model_name_or_path {base_model} "
        f"--train_data_dir {dataset_path} "
        f"--output_dir {output_dir} "
        f"--max_train_epochs {epochs} "
        f"--learning_rate {learning_rate} "
        f"--train_batch_size {batch_size} "
        f"--network_dim {network_dim} "
        f"--network_alpha {network_alpha} "
        f"--mixed_precision {mixed_precision} "
        f"--caption_dropout_rate {caption_dropout_rate}"
    )
    if resume_checkpoint:
        command = f"{command} --resume {resume_checkpoint}"
    return command
