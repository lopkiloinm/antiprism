"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconSparkles, IconZap } from "./Icons";
import { Streamdown } from "streamdown";
import { streamdownPlugins, getShikiTheme } from "@/lib/streamdownConfig";
import "streamdown/styles.css";
import { ThinkingRenderer } from "./ThinkingRenderer";
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

// Complex sequence representing the full simulation
const STEPS = [
  "INTRO",
  "WORKSPACE_ZOOM",
  "MODEL_SELECT_NANBEIGE",
  "MODEL_DOWNLOAD",
  "PROMPTING_TEXT",
  "THINKING_STREAM",
  "CODE_GEN_STREAM",
  "SHOW_DIFF",
  "VISION_TRANSITION",
  "WORKSPACE_VISION",
  "MODEL_SELECT_QWEN",
  "MODEL_DOWNLOAD_QWEN",
  "UPLOAD_IMAGE",
  "PROMPTING_IMAGE",
  "MULTIMODAL_STREAM",
  "WEBRTC_TRANSITION",
  "REALTIME_SYNC",
] as const;

export default function AnimatedHero() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [promptText, setPromptText] = useState("");
  const [visionPromptText, setVisionPromptText] = useState("");
  const [thinkingText, setThinkingText] = useState("");
  const [thinkingStartedAt, setThinkingStartedAt] = useState<number | undefined>(undefined);
  const [thinkingDurationMs, setThinkingDurationMs] = useState<number | undefined>(undefined);
  const [codeText, setCodeText] = useState("");
  const [multimodalText, setMultimodalText] = useState("");
  const [isThinkingComplete, setIsThinkingComplete] = useState(false);
  const [loremText, setLoremText] = useState("");
  const [webrtcStep, setWebrtcStep] = useState(0);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  
  const step = STEPS[currentStepIndex];

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    const advance = (delay: number) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (currentStepIndex < STEPS.length - 1) {
          setCurrentStepIndex(i => i + 1);
        } else {
          // Reset
          setCurrentStepIndex(0);
          setDownloadProgress(0);
          setPromptText("");
          setVisionPromptText("");
          setThinkingText("");
          setThinkingStartedAt(undefined);
          setThinkingDurationMs(undefined);
          setIsThinkingComplete(false);
          setCodeText("");
          setMultimodalText("");
          setLoremText("");
          setWebrtcStep(0);
        }
      }, delay);
    };

    switch (step) {
      case "INTRO":
        advance(2500);
        break;
      case "WORKSPACE_ZOOM":
        advance(1500);
        break;
      case "PROMPTING_TEXT": {
        let isCancelled = false;
        let charIndex = 0;
        const textToType = "Why is the sky blue?";
        setPromptText("");
        
        timer = setTimeout(() => {
          if (isCancelled) return;
          const typeInterval = setInterval(() => {
            if (isCancelled) {
              clearInterval(typeInterval);
              return;
            }
            if (charIndex < textToType.length) {
              setPromptText(textToType.substring(0, charIndex + 1));
              charIndex++;
            } else {
              clearInterval(typeInterval);
              advance(1500); // Pause after typing before jumping to bubble
            }
          }, 60);
        }, 1000); // Pause before typing starts
        
        return () => { isCancelled = true; clearTimeout(timer); };
      }
      case "MODEL_SELECT_NANBEIGE":
        advance(1000);
        break;
      case "MODEL_DOWNLOAD":
        let p1 = 0;
        const downloadInterval = setInterval(() => {
          p1 += 5;
          if (p1 >= 100) {
            setDownloadProgress(100);
            clearInterval(downloadInterval);
            advance(500);
          } else {
            setDownloadProgress(p1);
          }
        }, 30);
        return () => clearInterval(downloadInterval);
      case "THINKING_STREAM": {
        let isCancelled = false;
        const now = Date.now();
        setThinkingStartedAt(now);
        setIsThinkingComplete(false);
        setThinkingText("");

        const run = async () => {
          const text = "The user is asking about the color of the sky. This is a classic physics question explained by Rayleigh scattering. I should format this as a comprehensive LaTeX document. It needs an introduction, a section on Rayleigh scattering with a formula, and a conclusion.\n\nLet's write out the document structure now.";
          for (let i = 1; i <= text.length; i++) {
            if (isCancelled) return;
            setThinkingText(text.substring(0, i));
            await new Promise(r => setTimeout(r, 15));
          }
          if (isCancelled) return;
          setIsThinkingComplete(true);
          setThinkingDurationMs(Date.now() - now);
          advance(400);
        };
        run();
        return () => { isCancelled = true; clearTimeout(timer); };
      }
      case "CODE_GEN_STREAM": {
        let isCancelled = false;
        setCodeText("");
        
        const run = async () => {
          const text = "\\documentclass{article}\n\\usepackage{amsmath}\n\n\\title{Why is the Sky Blue?}\n\\author{AI Assistant}\n\n\\begin{document}\n\\maketitle\n\n\\section{Introduction}\nThe sky appears blue to the human eye primarily due to a phenomenon known as \\textbf{Rayleigh scattering}.\n\n\\subsection{The Physics of Light}\nWhen sunlight reaches Earth's atmosphere, gases and particles scatter the light. Shorter wavelengths scatter more easily.\n\nThe scattering intensity $I$ is given by:\n\n\\begin{equation}\nI \\propto \\frac{1}{\\lambda^4}\n\\end{equation}\n\nSince blue light has a shorter wavelength $\\lambda$ than red light, it scatters more intensely across the sky.\n\n\\end{document}";
          for (let i = 1; i <= text.length; i++) {
            if (isCancelled) return;
            setCodeText(text.substring(0, i));
            await new Promise(r => setTimeout(r, 10));
          }
          if (isCancelled) return;
          advance(800);
        };
        run();
        return () => { isCancelled = true; clearTimeout(timer); };
      }
      case "SHOW_DIFF":
        advance(2000);
        break;
      case "VISION_TRANSITION":
        advance(2500);
        break;
      case "WORKSPACE_VISION":
        advance(1000);
        break;
      case "MODEL_SELECT_QWEN":
        advance(1000);
        break;
      case "MODEL_DOWNLOAD_QWEN":
        setDownloadProgress(0);
        let p2 = 0;
        const downloadIntervalQwen = setInterval(() => {
          p2 += 5;
          if (p2 >= 100) {
            setDownloadProgress(100);
            clearInterval(downloadIntervalQwen);
            advance(500);
          } else {
            setDownloadProgress(p2);
          }
        }, 30);
        return () => clearInterval(downloadIntervalQwen);
      case "UPLOAD_IMAGE":
        advance(400);
        break;
      case "PROMPTING_IMAGE": {
        let isCancelled = false;
        let charIndex = 0;
        const imgText = "Explain this diagram.";
        setVisionPromptText("");
        
        timer = setTimeout(() => {
          if (isCancelled) return;
          const imgInterval = setInterval(() => {
            if (isCancelled) {
              clearInterval(imgInterval);
              return;
            }
            if (charIndex < imgText.length) {
              setVisionPromptText(imgText.substring(0, charIndex + 1));
              charIndex++;
            } else {
              clearInterval(imgInterval);
              advance(1500); // Pause after typing
            }
          }, 60);
        }, 1000); // Pause before typing
        
        return () => { isCancelled = true; clearTimeout(timer); };
      }
      case "MULTIMODAL_STREAM": {
        let isCancelled = false;
        setMultimodalText("");
        
        const run = async () => {
          const text = "This diagram illustrates **Rayleigh scattering**, showing how shorter (blue) wavelengths of sunlight scatter more efficiently when hitting particles in the atmosphere compared to longer (red) wavelengths.";
          for (let i = 1; i <= text.length; i++) {
            if (isCancelled) return;
            setMultimodalText(text.substring(0, i));
            await new Promise(r => setTimeout(r, 20));
          }
          if (isCancelled) return;
          advance(4000);
        };
        run();
        return () => { isCancelled = true; clearTimeout(timer); };
      }
      case "WEBRTC_TRANSITION":
        advance(2500);
        break;
      case "REALTIME_SYNC":
        let rtStep = 0;
        const webrtcInterval = setInterval(() => {
          rtStep++;
          if (rtStep <= 6) {
            setWebrtcStep(rtStep);
          } else if (rtStep === 7) {
            setWebrtcStep(7);
            clearInterval(webrtcInterval);
            
            // Start typing lorem ipsum in parallel
            const loremStr1 = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
            const loremStr2 = "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.";
            
            let lIdx1 = 0;
            let lIdx2 = 0;
            let isDone1 = false;
            let isDone2 = false;
            
            const loremInterval = setInterval(() => {
              let text1 = "";
              let text2 = "";
              
              if (lIdx1 < loremStr1.length) {
                text1 = loremStr1.substring(0, lIdx1 + 1);
                lIdx1++;
              } else {
                text1 = loremStr1;
                isDone1 = true;
              }
              
              if (lIdx2 < loremStr2.length) {
                text2 = loremStr2.substring(0, lIdx2 + 1);
                lIdx2++;
              } else {
                text2 = loremStr2;
                isDone2 = true;
              }
              
              setLoremText(`${text1}\n\n${text2}`);
              
              if (isDone1 && isDone2) {
                clearInterval(loremInterval);
                advance(5000);
              }
            }, 30); // Standard typing speed
          }
        }, 1500);
        return () => clearInterval(webrtcInterval);
    }

    return () => clearTimeout(timer);
  }, [step, currentStepIndex]);

  const showCodePanel = ["WORKSPACE_ZOOM", "MODEL_SELECT_NANBEIGE", "MODEL_DOWNLOAD", "PROMPTING_TEXT", "THINKING_STREAM", "CODE_GEN_STREAM", "SHOW_DIFF", "WORKSPACE_VISION", "MODEL_SELECT_QWEN", "MODEL_DOWNLOAD_QWEN", "UPLOAD_IMAGE", "PROMPTING_IMAGE", "MULTIMODAL_STREAM"].includes(step);
  const showPdfPanel = ["SHOW_DIFF", "VISION_TRANSITION", "WORKSPACE_VISION", "MODEL_SELECT_QWEN", "MODEL_DOWNLOAD_QWEN", "UPLOAD_IMAGE", "PROMPTING_IMAGE", "MULTIMODAL_STREAM"].includes(step);
  const isQwen = ["WORKSPACE_VISION", "MODEL_SELECT_QWEN", "MODEL_DOWNLOAD_QWEN", "UPLOAD_IMAGE", "PROMPTING_IMAGE", "MULTIMODAL_STREAM"].includes(step);

  return (
    <div className="relative w-full min-h-[600px] sm:min-h-[750px] bg-transparent perspective-[1000px] font-sans">
      <AnimatePresence mode="wait">
        {step === "INTRO" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center overflow-hidden"
          >
            <div className="landing-hero-aura absolute inset-[-18%] bg-[radial-gradient(circle_at_50%_50%,rgba(163,205,255,0.4),transparent_60%)]" />
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10 text-5xl sm:text-7xl font-bold tracking-tight text-zinc-900"
            >
              Introducing <span className="text-blue-600">Antiprism</span>
            </motion.h2>
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 text-zinc-500 text-lg max-w-2xl font-light"
            >
              Streaming local intelligence
            </motion.p>
          </motion.div>
        )}

        {step === "VISION_TRANSITION" && (
          <motion.div
            key="vision"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center overflow-hidden"
          >
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10 text-5xl sm:text-6xl font-bold tracking-tight text-zinc-900"
            >
              Vision Models <span className="text-blue-600">in-browser</span>
            </motion.h2>
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 text-zinc-500 text-lg max-w-2xl font-light"
            >
              Inspect figures directly within your workspace
            </motion.p>
          </motion.div>
        )}

        {step === "WEBRTC_TRANSITION" && (
          <motion.div
            key="webrtc"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center overflow-hidden"
          >
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10 text-5xl sm:text-6xl font-bold tracking-tight text-zinc-900"
            >
              Real-time file tree <span className="text-blue-600">sync</span>
            </motion.h2>
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 text-zinc-500 text-lg max-w-2xl font-light"
            >
              Peer-to-peer over WebRTC, no servers required
            </motion.p>
          </motion.div>
        )}

        {showCodePanel && (
          <motion.div
            key="workspace"
            initial={{ opacity: 0, scale: 1.05, rotateX: 5 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.3 }}
            className="absolute inset-x-0 inset-y-4 sm:inset-y-8 flex flex-col rounded-[16px] sm:rounded-[24px] border border-zinc-200 bg-white shadow-2xl overflow-hidden"
          >
            {/* Top Bar - Mac Traffic Lights */}
            <div className="flex h-12 items-center justify-between border-b border-zinc-200 bg-zinc-50/80 px-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#ff5f56] shadow-sm border border-black/10" />
                <span className="h-3 w-3 rounded-full bg-[#ffbd2e] shadow-sm border border-black/10" />
                <span className="h-3 w-3 rounded-full bg-[#27c93f] shadow-sm border border-black/10" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-600">sky-physics.tex</span>
              </div>
              <div className="w-16" />
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Left Panel - File Tree & AI */}
              <div className="w-80 flex flex-col border-r border-zinc-200 bg-zinc-50/40">
                <div className="p-4 border-b border-zinc-200 bg-white/50">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-2">Model Selection</div>
                  <div className="relative">
                    <div className="flex items-center justify-between w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm transition-all relative">
                      <span className="font-medium text-zinc-700">
                        {isQwen ? "Qwen3.5 0.8B Vision" : "Nanbeige4.1 3B Thinking"}
                      </span>
                    </div>
                    {/* Model dropdown selection animation */}
                    <AnimatePresence>
                      {step === "MODEL_SELECT_NANBEIGE" && (
                        <motion.div 
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg z-20"
                        >
                          <div className="rounded-md bg-blue-50 p-2 text-sm text-blue-700 font-medium">Nanbeige4.1 3B Thinking</div>
                          <div className="rounded-md p-2 text-sm text-zinc-600">Qwen3.5 0.8B Vision</div>
                        </motion.div>
                      )}
                      {step === "MODEL_SELECT_QWEN" && (
                        <motion.div 
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg z-20"
                        >
                          <div className="rounded-md p-2 text-sm text-zinc-600">Nanbeige4.1 3B Thinking</div>
                          <div className="rounded-md bg-blue-50 p-2 text-sm text-blue-700 font-medium">Qwen3.5 0.8B Vision</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {/* Download Progress */}
                  <AnimatePresence>
                    {(step === "MODEL_DOWNLOAD" || step === "MODEL_DOWNLOAD_QWEN") && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 overflow-hidden"
                      >
                        <div className="flex justify-between text-xs text-zinc-500 mb-1.5 font-medium">
                          <span>Downloading weights...</span>
                          <span>{downloadProgress}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-zinc-200 overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500 transition-all duration-75 ease-linear" style={{ width: `${downloadProgress}%` }} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex-1 p-4 flex flex-col overflow-y-auto bg-white/50 scroll-smooth" ref={el => {
                  if (el) el.scrollTop = el.scrollHeight;
                }}>
                  <div className="flex-1 flex flex-col gap-4 pb-4">
                    {/* Prompt rendering */}
                    {(step === "THINKING_STREAM" || step === "CODE_GEN_STREAM" || step === "SHOW_DIFF" || step === "VISION_TRANSITION" || step === "WORKSPACE_VISION" || step === "MODEL_SELECT_QWEN" || step === "MODEL_DOWNLOAD_QWEN" || step === "UPLOAD_IMAGE" || step === "PROMPTING_IMAGE" || step === "MULTIMODAL_STREAM" || step === "WEBRTC_TRANSITION" || step === "REALTIME_SYNC") && (
                      <motion.div 
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="self-end rounded-2xl rounded-tr-sm bg-blue-500 px-4 py-2.5 text-[14px] text-white shadow-sm max-w-[85%]"
                      >
                        Why is the sky blue?
                      </motion.div>
                    )}
                    
                    {/* Thinking stream rendering */}
                    {(step === "THINKING_STREAM" || step === "CODE_GEN_STREAM" || step === "SHOW_DIFF" || step === "VISION_TRANSITION" || step === "WORKSPACE_VISION" || step === "MODEL_SELECT_QWEN" || step === "MODEL_DOWNLOAD_QWEN" || step === "UPLOAD_IMAGE" || step === "PROMPTING_IMAGE" || step === "MULTIMODAL_STREAM" || step === "WEBRTC_TRANSITION" || step === "REALTIME_SYNC") && thinkingText && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full flex justify-start max-w-[95%] theme-light"
                        style={{ '--foreground': '#27272a', '--background': '#ffffff', '--border': '#e4e4e7', '--muted': '#a1a1aa' } as React.CSSProperties}
                      >
                        <ThinkingRenderer 
                           thinkingContent={thinkingText}
                           isStreaming={step === "THINKING_STREAM" && !isThinkingComplete}
                           initialExpanded={true}
                           startedAt={thinkingStartedAt}
                           durationMs={thinkingDurationMs}
                        />
                      </motion.div>
                    )}

                    {/* Image Prompting Message Bubble */}
                    {(step === "MULTIMODAL_STREAM" || step === "WEBRTC_TRANSITION" || step === "REALTIME_SYNC") && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9, transformOrigin: "bottom right" }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="self-end rounded-2xl rounded-tr-sm bg-blue-500 p-3 text-sm text-white shadow-sm max-w-[85%] flex flex-col gap-3"
                      >
                         <div className="relative h-28 w-48 rounded-xl bg-white flex flex-col items-center justify-center border border-white/20 overflow-hidden shadow-sm">
                           <span className="font-serif text-2xl text-black">I ∝ 1/λ⁴</span>
                         </div>
                         <div className="px-1 text-[14px]">Explain this diagram.</div>
                      </motion.div>
                    )}
                    
                    {/* Multimodal response */}
                    {(step === "MULTIMODAL_STREAM" || step === "WEBRTC_TRANSITION" || step === "REALTIME_SYNC") && multimodalText && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full flex justify-start streamdown-content prose prose-sm max-w-[95%] text-[14px] text-zinc-800 theme-light leading-relaxed"
                      >
                        <Streamdown plugins={streamdownPlugins} shikiTheme={getShikiTheme(false)} animated={false}>
                          {multimodalText}
                        </Streamdown>
                      </motion.div>
                    )}
                  </div>
                  
                  {/* AI Input Box */}
                  <div className={`relative rounded-xl border bg-white p-2 flex items-center gap-2 mt-auto sticky bottom-0 transition-all duration-300 ${
                    (step === "PROMPTING_TEXT" || step === "UPLOAD_IMAGE" || step === "PROMPTING_IMAGE") 
                      ? "border-blue-400 shadow-[0_0_0_2px_rgba(59,130,246,0.2)]" 
                      : "border-zinc-200 shadow-sm"
                  }`}>
                    {(step === "UPLOAD_IMAGE" || step === "PROMPTING_IMAGE") && (
                      <div className="relative h-16 w-24 rounded-lg bg-white flex flex-col items-center justify-center border border-zinc-200 overflow-hidden shadow-sm shrink-0 mb-0.5 ml-0.5">
                        <span className="font-serif text-sm text-black">I ∝ 1/λ⁴</span>
                      </div>
                    )}
                    
                    {isQwen && step !== "UPLOAD_IMAGE" && step !== "PROMPTING_IMAGE" && (
                      <button className="text-zinc-400 hover:text-zinc-600 p-1.5 relative rounded-md hover:bg-zinc-50 transition-colors shrink-0 self-center">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      </button>
                    )}
                    
                    <div className="flex-1 min-h-[32px] bg-transparent text-[14px] text-zinc-600 flex items-center px-1">
                      {step === "PROMPTING_TEXT" ? (promptText || <span className="text-zinc-400">Ask anything</span>) : 
                       step === "PROMPTING_IMAGE" ? (visionPromptText || <span className="text-zinc-400">Ask anything</span>) : 
                       (step === "THINKING_STREAM" || step === "CODE_GEN_STREAM" || step === "SHOW_DIFF" || step === "VISION_TRANSITION" || step === "WORKSPACE_VISION" || step === "MODEL_SELECT_QWEN" || step === "MODEL_DOWNLOAD_QWEN" || step === "UPLOAD_IMAGE" || step === "MULTIMODAL_STREAM" || step === "WEBRTC_TRANSITION" || step === "REALTIME_SYNC") ? "" : 
                       <span className="text-zinc-400">Ask anything</span>}
                    </div>
                    
                    <div className="p-1.5 rounded-lg bg-zinc-100 text-zinc-400 shrink-0 self-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center Panel - Editor */}
              <div className="flex-1 flex flex-col bg-white border-r border-zinc-200 relative overflow-hidden">
                <div className="absolute inset-0 p-4 sm:p-6 overflow-y-auto">
                  {codeText ? (
                    <div className="font-mono text-[13px] sm:text-[14px] leading-relaxed relative flex flex-col w-full">
                      {codeText.split('\n').map((line, i) => {
                        const isCmd = line.startsWith('\\') || line.trim().startsWith('\\');
                        const isBlockFormula = line.includes('\\begin{equation}') || line.includes('\\end{equation}') || line.includes('I \\propto \\frac{1}{\\lambda^4}');
                        
                        // Extract leading whitespace for indentation
                        const matchIndent = line.match(/^(\s*)/);
                        const indent = matchIndent ? matchIndent[1] : '';
                        const trimmedLine = line.substring(indent.length);
                        
                        // Extracting standard highlighting scheme with better contrast
                        const renderLine = () => {
                           if (isCmd) {
                             // LaTeX commands like \documentclass, \usepackage, \begin, etc.
                             const match = trimmedLine.match(/^(\\\w+)(?:{(.*?)})?/);
                             if (match) {
                               const [, cmd, arg] = match;
                               return (
                                 <span>
                                   <span className="text-[#a626a4] font-semibold">{cmd}</span>
                                   {arg && <span className="text-[#50a14f] font-medium">{`{${arg}}`}</span>}
                                   <span className="text-[#383a42]">{trimmedLine.substring(match[0].length)}</span>
                                 </span>
                               );
                             }
                             return <span className="text-[#a626a4] font-semibold">{trimmedLine}</span>;
                           } else if (isBlockFormula) {
                             // Block formulas - use distinct color for math
                             return <span className="text-[#986801] font-medium">{trimmedLine}</span>;
                           } else if (trimmedLine.includes('$')) {
                             // Text with inline formulas
                             const parts = trimmedLine.split(/(\$.*?\$)/g);
                             return (
                               <span className="text-[#24292e]">
                                 {parts.map((part, pIdx) => (
                                   part.startsWith('$') && part.endsWith('$') 
                                     ? <span key={pIdx} className="text-[#986801] font-medium">{part}</span>
                                     : <span key={pIdx}>{part}</span>
                                 ))}
                               </span>
                             );
                           } else if (trimmedLine.trim().length > 0) {
                             // Regular text - strong black for contrast
                             return <span className="text-[#24292e]">{trimmedLine}</span>;
                           }
                           return <span>{trimmedLine}</span>;
                        };
                        
                        return (
                          <div key={i} className="flex w-full min-h-[22px]">
                            <div className="w-8 sm:w-10 shrink-0 text-right pr-3 select-none text-[#a0a1a7] text-[12px] opacity-70 sticky left-0 bg-white z-10 py-[1px]">
                              {i + 1}
                            </div>
                            <div className="flex-1 pl-1 py-[1px] break-all sm:break-words whitespace-pre-wrap">
                              {indent}
                              {renderLine()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-zinc-400 italic font-mono text-[14px]"></div>
                  )}
                </div>
              </div>

              {/* Right Panel - PDF Viewer (Appears on Compile) */}
              <AnimatePresence>
                {showPdfPanel && (
                  <motion.div 
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "45%", opacity: 1 }}
                    className="border-l border-zinc-200 bg-zinc-100 flex flex-col z-10 shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.05)]"
                  >
                    <div className="flex-1 p-6 flex justify-center overflow-y-auto bg-zinc-100/80">
                      <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="w-full bg-white shadow-md border border-zinc-200 p-8 sm:p-10 flex flex-col items-center shrink-0 min-h-max"
                      >
                        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-center mb-2 text-black">Why is the Sky Blue?</h1>
                        <div className="text-sm sm:text-base font-serif text-center mb-8 text-zinc-600">AI Assistant</div>
                        
                        <h2 className="text-lg sm:text-xl font-serif font-bold self-start w-full mb-3 text-black">1 Introduction</h2>
                        <motion.p className="text-sm sm:text-[15px] font-serif leading-relaxed text-justify mb-6 text-zinc-800">
                          The sky appears blue to the human eye primarily due to a phenomenon known as <strong>Rayleigh scattering</strong>.
                        </motion.p>
                        
                        <h3 className="text-base sm:text-lg font-serif font-bold self-start w-full mb-2 text-black">1.1 The Physics of Light</h3>
                        <motion.p className="text-sm sm:text-[15px] font-serif leading-relaxed text-justify mb-4 text-zinc-800">
                          When sunlight reaches Earth's atmosphere, gases and particles scatter the light in all directions. Sunlight looks white but is made up of all colors of the visible spectrum. Shorter wavelengths (blue and violet) scatter more easily than longer wavelengths (red and yellow).
                        </motion.p>
                        
                        <div className="w-full my-6 flex justify-center py-4 border-y border-zinc-100">
                          <BlockMath math="I \propto \frac{1}{\lambda^4}" />
                        </div>
                        
                        <motion.p className="text-sm sm:text-[15px] font-serif leading-relaxed text-justify text-zinc-800">
                          Since blue light has a shorter wavelength <InlineMath math="\lambda" /> than red light, it scatters more intensely across the sky, which is why we perceive the sky as blue during the day.
                        </motion.p>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {step === "REALTIME_SYNC" && (
          <motion.div
            key="sync"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 inset-y-4 sm:inset-y-8 flex items-center justify-center px-4 sm:px-8 gap-4 sm:gap-8"
          >
            {/* Browser 1 */}
            <div className="flex-1 h-full rounded-[16px] sm:rounded-[24px] border border-zinc-200 bg-white shadow-2xl flex flex-col overflow-hidden relative">
              <div className="h-12 bg-zinc-50 border-b border-zinc-200 flex items-center px-4 gap-2">
                <div className="flex gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#ff5f56] shadow-sm border border-black/10" />
                  <span className="h-3 w-3 rounded-full bg-[#ffbd2e] shadow-sm border border-black/10" />
                  <span className="h-3 w-3 rounded-full bg-[#27c93f] shadow-sm border border-black/10" />
                </div>
                <div className="flex-1 mx-4 bg-white border border-zinc-200 rounded-md text-xs text-center text-zinc-500 py-1.5 font-medium shadow-sm">Alice's View</div>
              </div>
              <div className="flex flex-1 overflow-hidden relative">
                <div className="w-48 sm:w-56 border-r border-zinc-200 bg-zinc-50/50 p-4 flex flex-col gap-1">
                  <div className="flex items-center justify-between mb-3">
                     <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Files</div>
                     <div className="flex gap-1">
                        <button className={`p-1 hover:bg-zinc-200 rounded ${webrtcStep === 1 ? "bg-zinc-200 text-blue-600" : "text-zinc-500"}`}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
                        </button>
                        <button className={`p-1 hover:bg-zinc-200 rounded ${webrtcStep === 3 ? "bg-zinc-200 text-blue-600" : "text-zinc-500"}`}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
                        </button>
                     </div>
                  </div>
                  
                  <div className="text-sm text-zinc-700 flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-zinc-100">
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                     main.tex
                  </div>

                  <AnimatePresence>
                    {webrtcStep >= 2 && (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-sm text-zinc-700 flex flex-col"
                      >
                         <div className={`flex items-center gap-2 py-1.5 px-2 rounded-md ${webrtcStep === 3 ? "bg-blue-50 text-blue-700 font-medium" : "text-zinc-700 hover:bg-zinc-100"}`}>
                           <svg width="14" height="14" viewBox="0 0 24 24" fill={webrtcStep >= 4 ? "none" : "currentColor"} stroke="currentColor" strokeWidth="2" className={webrtcStep === 3 ? "text-blue-500" : "text-zinc-400"}>
                             {webrtcStep >= 4 ? (
                               <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                             ) : (
                               <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                             )}
                           </svg>
                           lorem
                         </div>
                         
                         {webrtcStep >= 4 && (
                           <motion.div 
                             initial={{ opacity: 0, height: 0 }}
                             animate={{ opacity: 1, height: "auto" }}
                             className={`ml-4 flex items-center gap-2 py-1.5 px-2 text-sm rounded-md bg-blue-50 text-blue-700 font-medium`}
                           >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                              ipsum.tex
                           </motion.div>
                         )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Creation Modal */}
                  <AnimatePresence>
                    {(webrtcStep === 1 || webrtcStep === 3) && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-30 flex items-center justify-center bg-black/10 backdrop-blur-sm"
                      >
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-white border border-zinc-200 shadow-xl rounded-xl p-4 w-64"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-zinc-700">New {webrtcStep === 1 ? 'Folder' : 'File'}</span>
                          </div>
                          <div className="bg-white border border-zinc-200 rounded px-2 py-1 text-sm text-zinc-800 font-mono shadow-inner mb-3">
                            {webrtcStep === 1 ? (
                              <span className="flex items-center gap-1.5">lorem</span>
                            ) : (
                              <span className="flex items-center gap-1.5">ipsum.tex</span>
                            )}
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="flex-1 p-4 sm:p-6 font-mono text-[13px] sm:text-[14px] leading-relaxed relative bg-white overflow-y-auto">
                  {webrtcStep >= 7 && (
                     <div className="relative flex flex-col w-full">
                       {loremText.split('\n').map((line, i) => (
                         <div key={i} className="flex w-full min-h-[22px]">
                           <div className="w-8 sm:w-10 shrink-0 text-right pr-3 select-none text-[#a0a1a7] text-[12px] opacity-70 sticky left-0 bg-white z-10 py-[1px]">
                             {i + 1}
                           </div>
                           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 pl-1 py-[1px] break-all sm:break-words whitespace-pre-wrap text-[#24292e]">
                             {line || " "}
                           </motion.div>
                         </div>
                       ))}
                     </div>
                   )}
                </div>
              </div>
            </div>

            {/* Browser 2 */}
            <div className="flex-1 h-full rounded-[16px] sm:rounded-[24px] border border-zinc-200 bg-white shadow-2xl flex flex-col overflow-hidden relative">
              <div className="h-12 bg-zinc-50 border-b border-zinc-200 flex items-center px-4 gap-2">
                <div className="flex gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#ff5f56] shadow-sm border border-black/10" />
                  <span className="h-3 w-3 rounded-full bg-[#ffbd2e] shadow-sm border border-black/10" />
                  <span className="h-3 w-3 rounded-full bg-[#27c93f] shadow-sm border border-black/10" />
                </div>
                <div className="flex-1 mx-4 bg-white border border-zinc-200 rounded-md text-xs text-center text-zinc-500 py-1.5 font-medium shadow-sm">Bob's View</div>
              </div>
              <div className="flex flex-1 overflow-hidden">
                <div className="w-48 sm:w-56 border-r border-zinc-200 bg-zinc-50/50 p-4 flex flex-col gap-1">
                  <div className="flex items-center justify-between mb-3">
                     <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Files</div>
                     <div className="flex gap-1">
                        <button className="p-1 hover:bg-zinc-200 rounded text-zinc-500">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
                        </button>
                        <button className="p-1 hover:bg-zinc-200 rounded text-zinc-500">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
                        </button>
                     </div>
                  </div>
                  
                  <div className="text-sm text-zinc-700 flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-zinc-100">
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                     main.tex
                  </div>

                  <AnimatePresence>
                    {webrtcStep >= 2 && (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-sm text-zinc-700 flex flex-col rounded-md"
                      >
                         <div className={`flex items-center gap-2 py-1.5 px-2 rounded-md ${webrtcStep === 4 ? "bg-blue-50 text-blue-700 font-medium" : "text-zinc-700 hover:bg-zinc-100"}`}>
                           <svg width="14" height="14" viewBox="0 0 24 24" fill={webrtcStep >= 5 ? "none" : "currentColor"} stroke="currentColor" strokeWidth="2" className={webrtcStep === 4 ? "text-blue-500" : "text-zinc-400"}>
                             {webrtcStep >= 5 ? (
                               <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                             ) : (
                               <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                             )}
                           </svg>
                           lorem
                         </div>
                         
                         {webrtcStep >= 5 && (
                           <motion.div 
                             initial={{ opacity: 0, height: 0 }}
                             animate={{ opacity: 1, height: "auto" }}
                             className="ml-4 flex items-center gap-2 py-1.5 px-2 text-sm rounded-md bg-blue-50 text-blue-700 font-medium"
                           >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                              ipsum.tex
                           </motion.div>
                         )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="flex-1 p-4 sm:p-6 font-mono text-[13px] sm:text-[14px] leading-relaxed relative bg-white overflow-y-auto">
                  {webrtcStep >= 7 && (
                     <div className="relative flex flex-col w-full">
                       {loremText.split('\n').map((line, i) => (
                         <div key={i} className="flex w-full min-h-[22px]">
                           <div className="w-8 sm:w-10 shrink-0 text-right pr-3 select-none text-[#a0a1a7] text-[12px] opacity-70 sticky left-0 bg-white z-10 py-[1px]">
                             {i + 1}
                           </div>
                           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 pl-1 py-[1px] break-all sm:break-words whitespace-pre-wrap text-[#24292e]">
                             {line || " "}
                           </motion.div>
                         </div>
                       ))}
                     </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
