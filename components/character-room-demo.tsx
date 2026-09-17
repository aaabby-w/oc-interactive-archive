"use client";

import { useEffect, useRef, useState } from "react";
import type { CharacterResidence, ResidenceActivity } from "@/content/characters/types";
import { siteCopy } from "@/content/site";
import { chooseResidenceReply, getResidenceActivityAt } from "@/lib/residence-state";
import {
  createResidenceWeather,
  getWeatherSceneKey,
  restoreResidenceWeather,
  type ResidenceWeather,
} from "@/lib/residence-weather";
import { mountLowPolyResidenceScene } from "@/components/residence/lowpoly-residence-scene";

type RainLayer = { source: AudioBufferSourceNode; gain: GainNode };
type AmbientAudio = {
  context: AudioContext;
  master: GainNode;
  track: HTMLAudioElement;
  onEnded: () => void;
  rain: RainLayer | null;
};

const musicTracks = ["/audio/overworld.mp3", "/audio/calm-loop.mp3"];

function stopRainLayer(audio: AmbientAudio) {
  if (!audio.rain) return;
  const rain = audio.rain;
  const now = audio.context.currentTime;
  rain.gain.gain.cancelScheduledValues(now);
  rain.gain.gain.setValueAtTime(rain.gain.gain.value, now);
  rain.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  window.setTimeout(() => {
    try { rain.source.stop(); } catch { /* already stopped */ }
  }, 500);
  audio.rain = null;
}

function startRainLayer(audio: AmbientAudio, storm = false) {
  if (audio.rain) {
    const now = audio.context.currentTime;
    audio.rain.gain.gain.cancelScheduledValues(now);
    audio.rain.gain.gain.linearRampToValueAtTime(storm ? 0.12 : 0.075, now + 0.4);
    return;
  }
  const buffer = audio.context.createBuffer(1, audio.context.sampleRate * 2, audio.context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < channel.length; index += 1) channel[index] = Math.random() * 2 - 1;
  const source = audio.context.createBufferSource();
  const filter = audio.context.createBiquadFilter();
  const gain = audio.context.createGain();
  source.buffer = buffer;
  source.loop = true;
  filter.type = "bandpass";
  filter.frequency.value = storm ? 980 : 1280;
  filter.Q.value = 0.35;
  gain.gain.value = 0.0001;
  source.connect(filter).connect(gain).connect(audio.master);
  source.start();
  gain.gain.exponentialRampToValueAtTime(storm ? 0.12 : 0.075, audio.context.currentTime + 1.2);
  audio.rain = { source, gain };
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function CharacterRoomDemo({
  characterId,
  characterName,
  residence,
}: {
  characterId: string;
  characterName: string;
  residence?: CharacterResidence;
}) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const mount = useRef<HTMLDivElement>(null);
  const activityRef = useRef<ResidenceActivity>("idle");
  const weatherRef = useRef<ResidenceWeather>("clear");
  const nightRef = useRef(false);
  const waveUntil = useRef(0);
  const ambientAudio = useRef<AmbientAudio | null>(null);
  const [clock, setClock] = useState<Date | null>(null);
  const [activity, setActivity] = useState<ResidenceActivity>("idle");
  const [weather, setWeather] = useState<ResidenceWeather>("clear");
  const [musicOn, setMusicOn] = useState(false);
  const [reply, setReply] = useState<string>(siteCopy.residence.defaultReply);

  useEffect(() => {
    const syncResidence = () => {
      const now = new Date();
      const next = getResidenceActivityAt(now, characterId);
      setClock(now);
      nightRef.current = now.getHours() < 6 || now.getHours() >= 19;
      activityRef.current = next;
      setActivity(next);
    };
    syncResidence();
    const timer = window.setInterval(syncResidence, 30_000);
    return () => window.clearInterval(timer);
  }, [characterId]);

  useEffect(() => {
    const storageKey = `oc-residence-weather:${characterId}`;
    const syncWeather = () => {
      const now = Date.now();
      let stored: ReturnType<typeof restoreResidenceWeather> = null;
      try { stored = restoreResidenceWeather(window.localStorage.getItem(storageKey), now); } catch { stored = null; }
      const next = stored ?? createResidenceWeather(now);
      if (!stored) {
        try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* unavailable */ }
      }
      weatherRef.current = next.kind;
      setWeather(next.kind);
    };
    syncWeather();
    const timer = window.setInterval(syncWeather, 30_000);
    return () => window.clearInterval(timer);
  }, [characterId]);

  useEffect(() => {
    const container = mount.current;
    if (!container) return;
    return mountLowPolyResidenceScene({
      container,
      characterName,
      assetBasePath: basePath,
      activityRef,
      weatherRef,
      nightRef,
      waveUntil,
    });
  }, [basePath, characterName]);

  useEffect(() => {
    weatherRef.current = weather;
    const audio = ambientAudio.current;
    if (!audio) return;
    if (weather === "rain" || weather === "storm") startRainLayer(audio, weather === "storm");
    else stopRainLayer(audio);
  }, [weather]);

  useEffect(() => () => {
    const audio = ambientAudio.current;
    if (!audio) return;
    audio.track.removeEventListener("ended", audio.onEnded);
    audio.track.pause();
    if (audio.rain) {
      try { audio.rain.source.stop(); } catch { /* already stopped */ }
    }
    void audio.context.close();
    ambientAudio.current = null;
  }, []);

  const stopAmbient = () => {
    const audio = ambientAudio.current;
    if (!audio) return;
    audio.track.removeEventListener("ended", audio.onEnded);
    stopRainLayer(audio);
    const now = audio.context.currentTime;
    audio.master.gain.cancelScheduledValues(now);
    audio.master.gain.setValueAtTime(audio.master.gain.value, now);
    audio.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    window.setTimeout(() => {
      audio.track.pause();
      audio.track.removeAttribute("src");
      audio.track.load();
      void audio.context.close();
    }, 560);
    ambientAudio.current = null;
    setMusicOn(false);
  };

  const startAmbient = async () => {
    try {
      const context = new AudioContext();
      await context.resume();
      const master = context.createGain();
      master.gain.setValueAtTime(0.0001, context.currentTime);
      master.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 1.4);
      master.connect(context.destination);
      const sources = musicTracks.map((path) => `${basePath}${path}`);
      const track = new Audio();
      track.preload = "auto";
      let trackIndex = Math.floor(Math.random() * sources.length);
      const playTrack = () => {
        track.src = sources[trackIndex];
        trackIndex = (trackIndex + 1) % sources.length;
        void track.play().catch(() => setReply(siteCopy.residence.audioUnavailable));
      };
      const onEnded = () => playTrack();
      track.addEventListener("ended", onEnded);
      context.createMediaElementSource(track).connect(master);
      const audio: AmbientAudio = { context, master, track, onEnded, rain: null };
      ambientAudio.current = audio;
      if (weatherRef.current === "rain" || weatherRef.current === "storm") {
        startRainLayer(audio, weatherRef.current === "storm");
      }
      track.src = sources[trackIndex];
      trackIndex = (trackIndex + 1) % sources.length;
      await track.play();
      setMusicOn(true);
    } catch {
      const audio = ambientAudio.current;
      if (audio) {
        audio.track.pause();
        void audio.context.close();
        ambientAudio.current = null;
      }
      setReply(siteCopy.residence.audioUnavailable);
    }
  };

  const toggleAmbient = () => {
    if (musicOn) stopAmbient();
    else void startAmbient();
  };

  const greet = () => {
    const replies = {
      ...siteCopy.residence.replies,
      ...residence?.greetingReplies,
    } as Record<ResidenceActivity, readonly string[]>;
    if (activity !== "sleep" && activity !== "away") waveUntil.current = performance.now() + 2_600;
    setReply(chooseResidenceReply(activity, replies));
  };

  const activityDisplay = siteCopy.residence.activities[activity];
  const weatherSceneKey = clock ? getWeatherSceneKey(weather, clock) : "clear-day";
  const weatherDisplay = siteCopy.residence.weather[weatherSceneKey];

  return (
    <section className="residence-section" aria-labelledby="residence-title">
      <div className="residence-intro" data-text-reveal>
        <p className="section-index">{siteCopy.residence.eyebrow}</p>
        <h2 id="residence-title">{siteCopy.residence.title}</h2>
        <p>{siteCopy.residence.intro}</p>
      </div>
      <div className="residence-board">
        <span className="board-pin board-pin-a" aria-hidden="true" />
        <span className="board-pin board-pin-b" aria-hidden="true" />
        <span className="board-pin board-pin-c" aria-hidden="true" />
        <div className="residence-window">
          <div className="residence-canvas" ref={mount} data-cursor-focus />
          <div className="window-glare" aria-hidden="true" />
          <div className="residence-view-hint" aria-hidden="true">{siteCopy.residence.watchHint}</div>
          <div className="residence-weather-badge" data-weather={weatherSceneKey}>
            <span aria-hidden="true"><i /><i /><i /></span>
            <div><b>{weatherDisplay.zh}</b><small>{weatherDisplay.en}</small></div>
          </div>
        </div>
        <button
          className="residence-music"
          data-magnetic
          type="button"
          onClick={toggleAmbient}
          aria-pressed={musicOn}
          aria-label={musicOn ? siteCopy.residence.ambientOff : siteCopy.residence.ambientOn}
        >
          <span className="music-bars" aria-hidden="true"><i /><i /><i /></span>
          <span>{musicOn ? siteCopy.residence.ambientOff : siteCopy.residence.ambientOn}</span>
          <small>{siteCopy.residence.ambientEn}</small>
        </button>
        <div className="residence-status-note">
          <span className="residence-mood" data-activity={activity} aria-hidden="true">{activityDisplay.mood}</span>
          <div><span>{clock ? formatTime(clock) : "--:--"} · {activityDisplay.zh}</span><small>{activityDisplay.en}</small></div>
        </div>
        <div className="residence-dialogue">
          <p aria-live="polite">{reply}</p>
          <button className="residence-greet" type="button" onClick={greet} data-magnetic>
            <span aria-hidden="true">⌁</span>
            <span>{siteCopy.residence.greet}<small>{siteCopy.residence.greetEn}</small></span>
          </button>
        </div>
        <span className="board-caption" aria-hidden="true">OBSERVATION WINDOW · 001</span>
      </div>
    </section>
  );
}
