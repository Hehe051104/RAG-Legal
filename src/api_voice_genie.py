import os
import time
import requests
import multiprocessing
import genie_tts as genie
from pathlib import Path

# --- 0. 项目根目录（src/ 上一级） ---
ROOT_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = ROOT_DIR / "CharacterModels"
GENIE_DATA_DIR = ROOT_DIR / "GenieData"

# --- 1. 配置注册表 (在此处管理你的人物) ---
# 你可以根据需要无限添加新的配置块
CHARACTER_REGISTRY = {
    "nina": {
        "character_name": "nina",
        "onnx_model_dir": str(MODELS_DIR / "v2ProPlus/nina/tts_models"),
        "language": "zh",
        "ref_audio": {
            "path": str(MODELS_DIR / "v2ProPlus/nina/prompt_wav/nina_normal.wav"),
            "text": "ももかさんってそうなんですね。いますよね、つゆ多めがいいって人。",
            "lang": "jp"
        }
    },
    "feibi": {
        "character_name": "feibi",
        "onnx_model_dir": str(MODELS_DIR / "v2ProPlus/feibi/tts_models"),
        "language": "zh",
        "ref_audio": {
            "path": str(MODELS_DIR / "v2ProPlus/feibi/prompt_wav/zh_vo_Main_Linaxita_2_1_10_26.wav"),
            "text": "在此之前，请您务必继续享受旅居拉古那的时光。",
            "lang": "zh"
        }
    }
}

# --- 2. 服务器配置 ---
SERVER_HOST = "127.0.0.1"
SERVER_PORT = 9900
BASE_URL = f"http://{SERVER_HOST}:{SERVER_PORT}"

# 音频输出配置
BYTES_PER_SAMPLE = 2
CHANNELS = 2  # 保持双声道
SAMPLE_RATE = 32000

def run_server():
    os.chdir(str(ROOT_DIR))  # 确保 genie 能找到根目录的 CharacterModels/ 和 GenieData/
    genie.start_server(host=SERVER_HOST, port=SERVER_PORT, workers=1)

def setup_character(char_id):
    """
    一键初始化人物：发送加载模型和参考音频请求
    """
    if char_id not in CHARACTER_REGISTRY:
        print(f"[Error] 找不到人物配置: {char_id}")
        return False

    config = CHARACTER_REGISTRY[char_id]

    # 1. 加载模型
    print(f"\n[Client] 正在为 {char_id} 加载模型...")
    load_payload = {
        "character_name": config["character_name"],
        "onnx_model_dir": config["onnx_model_dir"],
        "language": config["language"]
    }

    # 2. 设置参考音
    ref_payload = {
        "character_name": config["character_name"],
        "audio_path": config["ref_audio"]["path"],
        "audio_text": config["ref_audio"]["text"],
        "language": config["ref_audio"]["lang"]
    }

    try:
        # 发送加载请求
        res1 = requests.post(f"{BASE_URL}/load_character", json=load_payload)
        res1.raise_for_status()

        # 发送参考音请求
        res2 = requests.post(f"{BASE_URL}/set_reference_audio", json=ref_payload)
        res2.raise_for_status()

        print(f"[Client] {char_id} 初始化成功！")
        return True
    except Exception as e:
        print(f"[Client] {char_id} 初始化失败: {e}")
        return False


def tts_streaming_playback(char_id, text):
    """
    执行 TTS 并双声道流式播放
    """
    import pyaudio
    import numpy as np

    config = CHARACTER_REGISTRY[char_id]
    tts_payload = {
        "character_name": config["character_name"],
        "text": text,
        "split_sentence": True,
        "speed": 1
    }

    p = pyaudio.PyAudio()
    stream = None
    try:
        with requests.post(f"{BASE_URL}/tts", json=tts_payload, stream=True) as response:
            response.raise_for_status()
            for chunk in response.iter_content(chunk_size=1024):
                if chunk:
                    # 单声道转双声道逻辑
                    mono_data = np.frombuffer(chunk, dtype=np.int16)
                    stereo_data = np.repeat(mono_data, 2)
                    stereo_chunk = stereo_data.tobytes()

                    if stream is None:
                        stream = p.open(format=p.get_format_from_width(BYTES_PER_SAMPLE),
                                        channels=CHANNELS,
                                        rate=SAMPLE_RATE,
                                        output=True)
                    stream.write(stereo_chunk)
    except Exception as e:
        print(f"[Client] TTS 播放出错: {e}")
    finally:
        if stream:
            stream.stop_stream()
            stream.close()
        p.terminate()


def main_client():
    # --- 在这里选择要使用的人物 ID ---
    target_char = "nina"  # 改为 "feibi" 即可切换
    # -----------------------------

    # 初始化人物
    if setup_character(target_char):
        # 执行测试
        test_text = "你好，我是正在运行的新配置人物。很高兴见到你。"
        tts_streaming_playback(target_char, test_text)


if __name__ == "__main__":
    import sys

    server_only = "--server-only" in sys.argv or "--server" in sys.argv

    server_process = multiprocessing.Process(target=run_server, daemon=True)
    server_process.start()
    time.sleep(3)  # 等待服务端启动

    if server_only:
        print("[Server] genie TTS 服务已启动，监听 127.0.0.1:9900")
        # 自动加载默认角色
        default_char = os.getenv("TTS_DEFAULT_CHARACTER", "nina")
        print(f"[Server] 正在加载默认角色: {default_char}")
        if not setup_character(default_char):
            print(f"[Server] ⚠️ 角色 {default_char} 加载失败，TTS 将不可用")
        try:
            server_process.join()  # 保持运行直到被终止
        except KeyboardInterrupt:
            pass
    else:
        try:
            main_client()
        finally:
            print("\n[Main] 正在关闭服务端...")
            server_process.terminate()
            server_process.join()
