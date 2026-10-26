// src/components/game/audio-manager.ts

class AudioManager {
  private bgMusic: HTMLAudioElement | null = null;
  private isPlaying = false;

  init() {
    if (this.bgMusic) return;
    // Cargamos el mp3 desde la carpeta public
    this.bgMusic = new Audio("/audio/lobby-bg.mp3");
    this.bgMusic.loop = true; // Reproducción infinita
    this.bgMusic.volume = 0.4; // Volumen al 40% por defecto
  }

  play() {
    this.init();
    if (this.bgMusic && !this.isPlaying) {
      this.bgMusic.play().then(() => {
        this.isPlaying = true;
      }).catch((e) => {
        console.warn("El navegador bloqueó el autoplay, esperando interacción del usuario.", e);
      });
    }
  }

  pause() {
    if (this.bgMusic && this.isPlaying) {
      this.bgMusic.pause();
      this.isPlaying = false;
    }
  }

  setVolume(vol: number) {
    this.init();
    if (this.bgMusic) this.bgMusic.volume = vol;
  }
}

export const audioManager = new AudioManager();