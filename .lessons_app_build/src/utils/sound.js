const correctAudio = new Audio("/static/assets/audio/correct.mp3");
const incorrectAudio = new Audio("/static/assets/audio/incorrect.mp3");

function play(audio) {
  if (!audio) return;
  try {
    audio.currentTime = 0;
    audio.play();
  } catch {
    // Ignore playback errors (autoplay restrictions, etc.)
  }
}

function playUrl(url) {
  if (!url) return;
  try {
    const audio = new Audio(url);
    audio.play();
  } catch {
    // Ignore playback errors (autoplay restrictions, etc.)
  }
}

export function playCorrectSound() {
  play(correctAudio);
}

export function playIncorrectSound() {
  play(incorrectAudio);
}

export function playCorrectSoundThen(audioUrl) {
  return new Promise((resolve) => {
    if (!audioUrl) {
      try {
        correctAudio.currentTime = 0;
        correctAudio.addEventListener("ended", resolve, { once: true });
        correctAudio.addEventListener("error", resolve, { once: true });
        correctAudio.play();
      } catch {
        resolve();
      }
      return;
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pp:postaudio-start"));
    }

    const playFollowUp = () => {
      try {
        const followUp = new Audio(audioUrl);
        const finish = () => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("pp:postaudio-end"));
          }
          resolve();
        };
        followUp.addEventListener("ended", finish, { once: true });
        followUp.addEventListener("error", finish, { once: true });
        followUp.play();
      } catch {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("pp:postaudio-end"));
        }
        resolve();
      }
    };

    try {
      correctAudio.currentTime = 0;
      correctAudio.addEventListener("ended", playFollowUp, { once: true });
      correctAudio.addEventListener("error", playFollowUp, { once: true });
      correctAudio.play();
    } catch {
      playFollowUp();
    }
  });
}
