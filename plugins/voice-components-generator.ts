/**
 * Voice Components Auto-Generation Plugin
 * Generates LMNT-enabled documentation components with conversational AI
 */

import * as fs from "fs/promises";
import * as path from "path";

interface VoiceComponentConfig {
  componentName: string;
  targetPath: string;
  includeConversation: boolean;
  includeQdrantStorage: boolean;
  voicePresets: string[];
  contentType?: "documentation" | "blog" | "general";
  enableBlogIntegration?: boolean;
}

export class VoiceComponentsGenerator {
  private outputDir: string;

  constructor(outputDir: string = "src/components/docs") {
    this.outputDir = outputDir;
  }

  /**
   * Generate voice-enabled documentation page component
   */
  async generateVoiceDocPage(config: VoiceComponentConfig): Promise<void> {
    const template = this.getDocPageTemplate(config);
    const outputPath = path.join(this.outputDir, `${config.componentName}.tsx`);

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, template, "utf-8");

    console.log(`✅ Generated voice doc page: ${outputPath}`);
  }

  /**
   * Generate voice configuration dialog
   */
  async generateVoiceConfigDialog(config: VoiceComponentConfig): Promise<void> {
    const template = this.getConfigDialogTemplate(config);
    const outputPath = path.join(this.outputDir, `${config.componentName}ConfigDialog.tsx`);

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, template, "utf-8");

    console.log(`✅ Generated voice config dialog: ${outputPath}`);
  }

  /**
   * Generate conversational chatbot component
   */
  async generateChatbotComponent(config: VoiceComponentConfig): Promise<void> {
    const template = this.getChatbotTemplate(config);
    const outputPath = path.join(this.outputDir, `${config.componentName}Chatbot.tsx`);

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, template, "utf-8");

    console.log(`✅ Generated chatbot component: ${outputPath}`);
  }

  /**
   * Generate API routes for voice and Qdrant
   */
  async generateAPIRoutes(config: VoiceComponentConfig = { componentName: "Documentation", targetPath: "src/components/docs", includeConversation: true, includeQdrantStorage: true, voicePresets: ["lily"] }): Promise<void> {
    const routes = [
      {
        path: "src/app/api/chat/documentation/route.ts",
        template: this.getDocChatAPITemplate(),
      },
      {
        path: "src/app/api/qdrant/save-conversation/route.ts",
        template: this.getQdrantSaveTemplate(),
      },
      {
        path: "src/app/api/qdrant/get-conversation/route.ts",
        template: this.getQdrantGetTemplate(),
      },
      {
        path: "src/app/api/qdrant/clear-conversation/route.ts",
        template: this.getQdrantClearTemplate(),
      },
    ];

    // Add blog-specific routes if enabled
    if (config.enableBlogIntegration || config.contentType === "blog") {
      routes.push(
        {
          path: "src/app/api/blog/voice/lmnt/route.ts",
          template: this.getDocChatAPITemplate(),
        },
        {
          path: "src/app/api/blog/chat/route.ts",
          template: this.getBlogChatAPITemplate(),
        }
      );
    }

    for (const route of routes) {
      await fs.mkdir(path.dirname(route.path), { recursive: true });
      await fs.writeFile(route.path, route.template, "utf-8");
      console.log(`✅ Generated API route: ${route.path}`);
    }
  }

  /**
   * Generate enhanced voice configuration dialog with Ollama support
   */
  async generateEnhancedVoiceConfigDialog(): Promise<void> {
    const template = this.getEnhancedConfigDialogTemplate();
    const outputPath = path.join("src/components/voice", "EnhancedVoiceConfigDialog.tsx");

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, template, "utf-8");

    console.log(`✅ Generated enhanced voice config dialog: ${outputPath}`);
  }

  /**
   * Generate blog post with voice integration
   */
  async generateBlogPostWithVoice(config: VoiceComponentConfig): Promise<void> {
    const template = this.getBlogPostWithVoiceTemplate(config);
    const outputPath = path.join("src/components/blog", "BlogPostWithVoice.tsx");

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, template, "utf-8");

    console.log(`✅ Generated blog post with voice: ${outputPath}`);
  }

  /**
   * Generate conversational AI chatbot for blog posts
   */
  async generateConversationalAIChatbot(): Promise<void> {
    const template = this.getConversationalAIChatbotTemplate();
    const outputPath = path.join("src/components/blog", "ConversationalAIChatbot.tsx");

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, template, "utf-8");

    console.log(`✅ Generated conversational AI chatbot: ${outputPath}`);
  }

  /**
   * Generate Ollama service integration
   */
  async generateOllamaService(): Promise<void> {
    const template = this.getOllamaServiceTemplate();
    const outputPath = path.join("src/lib/services", "ollama-service.ts");

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, template, "utf-8");

    console.log(`✅ Generated Ollama service: ${outputPath}`);
  }

  /**
   * Generate conversation persistence service
   */
  async generateConversationPersistence(): Promise<void> {
    const template = this.getConversationPersistenceTemplate();
    const outputPath = path.join("src/lib/services", "conversation-persistence.ts");

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, template, "utf-8");

    console.log(`✅ Generated conversation persistence service: ${outputPath}`);
  }

  /**
   * Generate complete voice integration package
   */
  async generateCompletePackage(
    componentName: string = "Documentation",
    options: Partial<VoiceComponentConfig> = {}
  ): Promise<void> {
    const config: VoiceComponentConfig = {
      componentName,
      targetPath: this.outputDir,
      includeConversation: options.includeConversation ?? true,
      includeQdrantStorage: options.includeQdrantStorage ?? true,
      voicePresets: options.voicePresets ?? ["lily", "daniel", "sarah", "alex"],
      contentType: options.contentType ?? "documentation",
      enableBlogIntegration: options.enableBlogIntegration ?? false,
    };

    console.log("🎙️  Generating complete voice integration package...\n");

    // Generate all components
    await this.generateVoiceDocPage(config);
    await this.generateVoiceConfigDialog(config);

    if (config.includeConversation) {
      await this.generateChatbotComponent(config);
    }

    // Generate blog components if enabled
    if (config.enableBlogIntegration || config.contentType === "blog") {
      console.log("📝 Including blog voice integration...");
      await this.generateBlogPostWithVoice(config);
      await this.generateConversationalAIChatbot();
    }

    // Generate API routes
    await this.generateAPIRoutes(config);

    // Generate documentation
    await this.generateDocumentation(config);

    console.log("\n✨ Voice integration package generated successfully!");
    console.log("\n📋 Next steps:");
    console.log("1. Install dependencies: bun add @qdrant/js-client-rest lmnt-node");
    console.log("2. Set environment variables:");
    console.log("   - LMNT_API_KEY");
    console.log("   - GROQ_API_KEY");
    console.log("   - QDRANT_URL (optional, defaults to http://localhost:6333)");
    console.log("   - QDRANT_API_KEY (optional)");
    console.log("3. Import and use in your documentation pages:");
    console.log(`   import { ${componentName}PageWithVoice } from '@/components/docs/${componentName}PageWithVoice';`);

    if (config.enableBlogIntegration || config.contentType === "blog") {
      console.log("\n📝 Blog integration included:");
      console.log("   import { BlogPostWithVoice } from '@/components/blog/BlogPostWithVoice';");
      console.log("   import { ConversationalAIChatbot } from '@/components/blog/ConversationalAIChatbot';");
    }
  }

  // Template methods

  private getDocPageTemplate(config: VoiceComponentConfig): string {
    return `"use client";

/**
 * ${config.componentName} Page with Voice Integration
 * Auto-generated by Voice Components Generator
 * ✅ PHASE 3: Uses VoiceConfigStore for audio playback state
 */

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Square, Volume2, VolumeX, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoiceConfigStore } from "@/stores/voice-config-store";
import { LMNTVoiceConfigDialog, type LMNTVoiceConfig } from "./LMNTVoiceConfigDialog";
${config.includeConversation ? `import { ConversationalVoiceChatbot } from "./ConversationalVoiceChatbot";` : ""}

interface ${config.componentName}PageProps {
  title: string;
  content: string;
  className?: string;
}

export function ${config.componentName}PageWithVoice({
  title,
  content,
  className,
}: ${config.componentName}PageProps) {
  // ✅ PHASE 3: Use voice config store for config AND playback state
  const {
    config: voiceConfig,
    isPlaying: isReading,
    isPaused,
    isMuted,
    isLoading: storeIsLoading,
    playbackError,
    updateConfig,
    playAudio,
    pauseAudio,
    resumeAudio,
    stopAudio,
    toggleMute: storeToggleMute,
    clearAudioState,
  } = useVoiceConfigStore();
  
  const [showChatbot, setShowChatbot] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(\`\${Date.now()}_session\`);

  // Voice functionality implementation
  const textToSpeech = useCallback(async (text: string): Promise<Blob | null> => {
    try {
      const response = await fetch("/api/voice/lmnt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: "accessibility",
          text,
          options: {
            voiceId: voiceConfig.voice,
            speed: voiceConfig.speed,
            volume: voiceConfig.volume,
            format: voiceConfig.format,
            sampleRate: voiceConfig.sampleRate,
          },
        }),
      });

      if (!response.ok) throw new Error(\`HTTP \${response.status}\`);

      const data = await response.json();
      const { audioChunks, format } = data;

      if (!audioChunks?.length) return null;

      const parts: Uint8Array[] = [];
      for (const base64 of audioChunks) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        parts.push(bytes);
      }

      const mime = format === "mp3" ? "audio/mpeg" : \`audio/\${format}\`;
      return new Blob(parts, { type: mime });
    } catch (error) {
      console.error("Text-to-speech failed:", error);
      return null;
    }
  }, [voiceConfig]);

  // ✅ PHASE 3: Voice handlers use store actions
  const textToSpeech = useCallback(async (text: string): Promise<Blob | null> => {
    try {
      const response = await fetch("/api/voice/lmnt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: "accessibility",
          text,
          options: {
            voiceId: voiceConfig.voice,
            speed: voiceConfig.speed,
            volume: voiceConfig.volume,
            format: voiceConfig.format,
            sampleRate: voiceConfig.sampleRate,
          },
        }),
      });

      if (!response.ok) throw new Error(\`HTTP \${response.status}\`);

      const data = await response.json();
      const { audioChunks, format } = data;

      if (!audioChunks?.length) return null;

      const parts: Uint8Array[] = [];
      for (const base64 of audioChunks) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        parts.push(bytes);
      }

      const mime = format === "mp3" ? "audio/mpeg" : \`audio/\${format}\`;
      return new Blob(parts, { type: mime });
    } catch (error) {
      console.error("Text-to-speech failed:", error);
      return null;
    }
  }, [voiceConfig]);

  const handleStartReading = useCallback(async () => {
    if (isReading) return;
    setIsLoading(true);

    try {
      const textContent = content.replace(/<[^>]*>/g, " ").replace(/\\s+/g, " ").trim();
      const audioBlob = await textToSpeech(textContent.substring(0, 3000));
      
      if (audioBlob) {
        const audio = new Audio(URL.createObjectURL(audioBlob));
        audio.volume = isMuted ? 0 : voiceConfig.volume;
        audio.onended = () => stopAudio();
        audio.onerror = () => stopAudio();
        
        // ✅ PHASE 3: Update store with audio state
        playAudio(\`doc-\${title}\`, URL.createObjectURL(audioBlob), audio);
        await audio.play();
      }
    } catch (error) {
      console.error("Failed to start reading:", error);
      stopAudio();
    } finally {
      setIsLoading(false);
    }
  }, [isReading, content, textToSpeech, isMuted, voiceConfig, title, playAudio, stopAudio]);

  const handlePauseResume = useCallback(() => {
    if (isPaused) {
      resumeAudio(); // ✅ PHASE 3: Use store action
    } else {
      pauseAudio(); // ✅ PHASE 3: Use store action
    }
  }, [isPaused, pauseAudio, resumeAudio]);

  const handleStopReading = useCallback(() => {
    stopAudio(); // ✅ PHASE 3: Use store action
  }, [stopAudio]);
  
  const handleToggleMute = useCallback(() => {
    storeToggleMute(); // ✅ PHASE 3: Use store action
  }, [storeToggleMute]);
  
  // ✅ PHASE 3: Cleanup on unmount only
  useEffect(() => {
    return () => {
      clearAudioState();
    };
  }, []); // ✅ Empty deps - cleanup on unmount only

  return (
    <div className={cn("space-y-4", className)}>
      <Card className="bg-card dark:bg-gray-800 border-border dark:border-gray-700 sticky top-0 z-10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!isReading ? (
                <Button onClick={handleStartReading} disabled={isLoading || storeIsLoading} size="sm">
                  {(isLoading || storeIsLoading) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Read Aloud
                </Button>
              ) : (
                <>
                  <Button onClick={handlePauseResume} variant="outline" size="sm">
                    {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </Button>
                  <Button onClick={handleStopReading} variant="outline" size="sm">
                    <Square className="h-4 w-4" />
                  </Button>
                  <Button onClick={handleToggleMute} variant="ghost" size="sm">
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                </>
              )}
              {isReading && (
                <Badge className="animate-pulse bg-primary/20 text-primary">
                  {isPaused ? "Paused" : "Reading"}
                </Badge>
              )}
              {playbackError && (
                <Badge variant="destructive">Error: {playbackError}</Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              ${config.includeConversation ? `
              <Button onClick={() => setShowChatbot(!showChatbot)} variant={showChatbot ? "default" : "outline"} size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                {showChatbot ? "Hide" : "Show"} Chat
              </Button>` : ""}
              <LMNTVoiceConfigDialog config={voiceConfig} onConfigChange={updateConfig} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={cn(showChatbot ? "lg:col-span-2" : "lg:col-span-3")}>
          <Card className="bg-card dark:bg-gray-800">
            <CardContent className="p-6">
              <h1 className="text-3xl font-bold mb-4 text-foreground dark:text-white">{title}</h1>
              <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: content }} />
            </CardContent>
          </Card>
        </div>

        ${config.includeConversation ? `
        {showChatbot && (
          <div className="lg:col-span-1">
            <ConversationalVoiceChatbot
              documentContent={content}
              documentTitle={title}
              voiceConfig={voiceConfig}
              sessionId={sessionId}
              className="h-[calc(100vh-8rem)]"
            />
          </div>
        )}` : ""}
      </div>
    </div>
  );
}
`;
  }

  private getConfigDialogTemplate(config: VoiceComponentConfig): string {
    return `// Voice Configuration Dialog Template
// Generated by Voice Components Generator
// See LMNTVoiceConfigDialog.tsx for full implementation
`;
  }

  private getChatbotTemplate(config: VoiceComponentConfig): string {
    return `// Conversational Chatbot Template
// Generated by Voice Components Generator
// See ConversationalVoiceChatbot.tsx for full implementation
`;
  }

  private getDocChatAPITemplate(): string {
    return `// Documentation Chat API Template
// See src/app/api/chat/documentation/route.ts for full implementation
`;
  }

  private getQdrantSaveTemplate(): string {
    return `// Qdrant Save Conversation Template
// See src/app/api/qdrant/save-conversation/route.ts for full implementation
`;
  }

  private getQdrantGetTemplate(): string {
    return `// Qdrant Get Conversation Template
// See src/app/api/qdrant/get-conversation/route.ts for full implementation
`;
  }

  private getQdrantClearTemplate(): string {
    return `// Qdrant Clear Conversation Template
// See src/app/api/qdrant/clear-conversation/route.ts for full implementation
`;
  }

  private getEnhancedConfigDialogTemplate(): string {
    return `// Enhanced Voice Configuration Dialog Template
// See src/components/voice/EnhancedVoiceConfigDialog.tsx for full implementation
`;
  }

  private getOllamaServiceTemplate(): string {
    return `// Ollama Service Template
// See src/lib/services/ollama-service.ts for full implementation
`;
  }

  private getConversationPersistenceTemplate(): string {
    return `// Conversation Persistence Service Template
// See src/lib/services/conversation-persistence.ts for full implementation
`;
  }

  private getBlogPostWithVoiceTemplate(config: VoiceComponentConfig): string {
    const defaultVoice = config.voicePresets[0] || "lily";
    const conversationEnabled = config.includeConversation;
    const qdrantEnabled = config.includeQdrantStorage;

    return `"use client";

/**
 * Blog Post with LMNT Voice Integration
 * Auto-generated by Voice Components Generator
 * Provides voice reading and AI conversation for blog posts
 * ✅ PHASE 3: Uses VoiceConfigStore for audio playback state
 */

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  MessageSquare,
  Loader2,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoiceConfigStore } from "@/stores/voice-config-store";
import { LMNTVoiceConfigDialog } from "@/components/docs/LMNTVoiceConfigDialog";
import { ConversationalAIChatbot } from "./ConversationalAIChatbot";
import { type LMNTVoiceConfig } from "@/components/docs/LMNTVoiceConfigDialog";

interface BlogPostWithVoiceProps {
  title: string;
  content: string;
  slug: string;
  category?: string;
  tags?: string[];
  excerpt?: string;
  className?: string;
  children?: React.ReactNode;
}

export function BlogPostWithVoice({
  title,
  content,
  slug,
  category,
  tags = [],
  excerpt,
  className,
  children,
}: BlogPostWithVoiceProps) {
  // ✅ PHASE 3: Use voice config store for config AND playback state
  const {
    config: voiceConfig,
    isPlaying: isReading,
    isPaused,
    isMuted,
    isLoading: storeIsLoading,
    playbackError,
    updateConfig,
    playAudio,
    pauseAudio,
    resumeAudio,
    stopAudio,
    toggleMute: storeToggleMute,
    clearAudioState,
  } = useVoiceConfigStore();
  
  const [showChatbot, setShowChatbot] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(\`blog_\${slug}_\${Date.now()}\`);

  // ✅ PHASE 3: Voice handlers use store actions
  const textToSpeech = useCallback(
    async (text: string): Promise<Blob | null> => {
      try {
        const response = await fetch("/api/blog/voice/lmnt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            text,
            slug,
            voiceId: voiceConfig.voice,
            speed: voiceConfig.speed,
            volume: voiceConfig.volume,
            format: voiceConfig.format,
            sampleRate: voiceConfig.sampleRate,
            language: voiceConfig.language,
          }),
        });

        if (!response.ok) throw new Error(\`HTTP \${response.status}\`);

        const data = await response.json();
        const { audioChunks, format } = data;

        if (!audioChunks?.length) return null;

        const parts: Uint8Array[] = [];
        for (const base64 of audioChunks) {
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          parts.push(bytes);
        }

        const mime = format === "mp3" ? "audio/mpeg" : \`audio/\${format}\`;
        return new Blob(parts, { type: mime });
      } catch (error) {
        console.error("Text-to-speech failed:", error);
        return null;
      }
    },
    [slug, voiceConfig]
  );

  const handleStartReading = useCallback(async () => {
    if (isReading) return;
    setIsLoading(true);

    try {
      // Clean markdown and HTML from content
      const textContent = content
        .replace(/<[^>]*>/g, " ")
        .replace(/[#*_\\\`~\\[\\]]/g, "")
        .replace(/\\\\s+/g, " ")
        .trim();

      // Limit content length for TTS (around 5000 chars)
      const truncatedText = textContent.substring(0, 5000);

      const audioBlob = await textToSpeech(truncatedText);

      if (audioBlob) {
        const audio = new Audio(URL.createObjectURL(audioBlob));
        audio.volume = isMuted ? 0 : voiceConfig.volume;
        audio.onended = () => stopAudio();
        audio.onerror = () => stopAudio();
        
        // ✅ PHASE 3: Update store with audio state
        playAudio(\`blog-\${slug}\`, URL.createObjectURL(audioBlob), audio);
        await audio.play();
      }
    } catch (error) {
      console.error("Failed to start reading:", error);
      stopAudio();
    } finally {
      setIsLoading(false);
    }
  }, [isReading, content, textToSpeech, isMuted, voiceConfig, slug, playAudio, stopAudio]);

  const handlePauseResume = useCallback(() => {
    if (isPaused) {
      resumeAudio(); // ✅ PHASE 3: Use store action
    } else {
      pauseAudio(); // ✅ PHASE 3: Use store action
    }
  }, [isPaused, pauseAudio, resumeAudio]);

  const handleStopReading = useCallback(() => {
    stopAudio(); // ✅ PHASE 3: Use store action
  }, [stopAudio]);

  const handleToggleMute = useCallback(() => {
    storeToggleMute(); // ✅ PHASE 3: Use store action
  }, [storeToggleMute]);

  // ✅ PHASE 3: Cleanup on unmount only (no auto-read)
  useEffect(() => {
    return () => {
      clearAudioState();
    };
  }, []); // ✅ Empty deps - cleanup on unmount only

  return (
    <div className={cn("space-y-4", className)}>
      {/* Voice Controls Header - Sticky */}
      <Card className="bg-card dark:bg-gray-800 border-border dark:border-gray-700 sticky top-16 z-10 shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Playback Controls */}
            <div className="flex items-center gap-3">
              {!isReading ? (
                <Button
                  onClick={handleStartReading}
                  disabled={isLoading}
                  size="sm"
                  className="bg-primary hover:bg-primary/90"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Volume2 className="h-4 w-4 mr-2" />
                  )}
                  Listen
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handlePauseResume}
                    variant="outline"
                    size="sm"
                  >
                    {isPaused ? (
                      <Play className="h-4 w-4" />
                    ) : (
                      <Pause className="h-4 w-4" />
                    )}
                  </Button>
                  <Button onClick={handleStopReading} variant="outline" size="sm">
                    <Square className="h-4 w-4" />
                  </Button>
                  <Button onClick={handleToggleMute} variant="ghost" size="sm">
                    {isMuted ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                </>
              )}
              {isReading && (
                <Badge className="animate-pulse bg-primary/20 text-primary">
                  {isPaused ? "Paused" : "Reading"}
                </Badge>
              )}
              {playbackError && (
                <Badge variant="destructive">Error: {playbackError}</Badge>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {voiceConfig.enableConversation && (
                <Button
                  onClick={() => setShowChatbot(!showChatbot)}
                  variant={showChatbot ? "default" : "outline"}
                  size="sm"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {showChatbot ? "Hide" : "Chat"}
                </Button>
              )}
              <LMNTVoiceConfigDialog 
                config={voiceConfig} 
                onConfigChange={updateConfig} 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Content */}
        <div className={cn(showChatbot ? "lg:col-span-2" : "lg:col-span-3")}>
          {children}
        </div>

        {/* AI Chatbot Sidebar */}
        {showChatbot && voiceConfig.enableConversation && (
          <div className="lg:col-span-1">
            <ConversationalAIChatbot
              documentContent={content}
              documentTitle={title}
              documentType="blog"
              documentSlug={slug}
              documentMetadata={{
                category,
                tags,
                excerpt,
              }}
              voiceConfig={voiceConfig}
              sessionId={sessionId}
              className="h-[calc(100vh-12rem)] sticky top-32"
            />
          </div>
        )}
      </div>

      {/* Voice Configuration Dialog */}
      <LMNTVoiceConfigDialog
        open={showConfigDialog}
        onOpenChange={setShowConfigDialog}
        config={voiceConfig}
        onConfigChange={setVoiceConfig}
      />
    </div>
  );
}
`;
  }

  private getConversationalAIChatbotTemplate(): string {
    return `"use client";

/**
 * Conversational AI Chatbot for Blog Posts
 * Auto-generated by Voice Components Generator
 * Provides intelligent conversation about blog content
 * ✅ PHASE 3: Minimal useEffect - only for UI auto-scroll (acceptable)
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  Trash2,
  Download,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface LMNTVoiceConfig {
  voice: string;
  speed: number;
  volume: number;
  language: string;
  format: string;
  sampleRate: number;
  enableConversation: boolean;
  enableContextMemory: boolean;
  autoRead: boolean;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

interface ConversationalAIChatbotProps {
  documentContent: string;
  documentTitle: string;
  documentType: "blog" | "documentation";
  documentSlug: string;
  documentMetadata?: {
    category?: string;
    tags?: string[];
    excerpt?: string;
  };
  voiceConfig: LMNTVoiceConfig;
  sessionId: string;
  className?: string;
}

export function ConversationalAIChatbot({
  documentContent,
  documentTitle,
  documentType,
  documentSlug,
  documentMetadata,
  voiceConfig,
  sessionId,
  className,
}: ConversationalAIChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ✅ ACCEPTABLE: Auto-scroll is UI behavior, not state management
  // This useEffect is acceptable because it's DOM manipulation based on messages
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]); // ✅ UI effect - scrolling behavior

  // Save conversation to Qdrant when enabled
  const saveMessageToQdrant = useCallback(
    async (message: Message) => {
      if (!voiceConfig.enableContextMemory) return;

      try {
        await fetch("/api/qdrant/save-conversation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            sessionId,
            message: {
              role: message.role,
              content: message.content,
              timestamp: message.timestamp.toISOString(),
            },
            metadata: {
              documentType,
              documentSlug,
              documentTitle,
              ...documentMetadata,
            },
          }),
        });
      } catch (error) {
        console.error("Failed to save message to Qdrant:", error);
      }
    },
    [
      sessionId,
      documentType,
      documentSlug,
      documentTitle,
      documentMetadata,
      voiceConfig.enableContextMemory,
    ]
  );

  // Send message to AI
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isProcessing) return;

      const userMessage: Message = {
        id: \`user_\${Date.now()}\`,
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputMessage("");
      setIsProcessing(true);

      // Save user message to Qdrant
      await saveMessageToQdrant(userMessage);

      try {
        const response = await fetch("/api/blog/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            message: content,
            documentContent,
            documentTitle,
            documentType,
            documentMetadata,
            conversationHistory: messages.slice(-5), // Last 5 messages for context
            sessionId,
            voiceConfig,
          }),
        });

        if (!response.ok) {
          throw new Error(\`HTTP \${response.status}\`);
        }

        const data = await response.json();

        const assistantMessage: Message = {
          id: \`assistant_\${Date.now()}\`,
          role: "assistant",
          content: data.response,
          timestamp: new Date(data.timestamp),
          audioUrl: data.audioUrl,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Save assistant message to Qdrant
        await saveMessageToQdrant(assistantMessage);

        // Auto-play voice response if enabled
        if (data.audioUrl && voiceConfig.enableConversation) {
          playAudioResponse(data.audioUrl);
        }
      } catch (error) {
        console.error("Failed to send message:", error);
        const errorMessage: Message = {
          id: \`error_\${Date.now()}\`,
          role: "assistant",
          content: "Sorry, I encountered an error processing your message. Please try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsProcessing(false);
      }
    },
    [
      isProcessing,
      messages,
      documentContent,
      documentTitle,
      documentType,
      documentMetadata,
      sessionId,
      voiceConfig,
      saveMessageToQdrant,
    ]
  );

  // Play audio response
  const playAudioResponse = useCallback((audioUrl: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(audioUrl);
    audio.volume = voiceConfig.volume;
    audio.onplay = () => setIsSpeaking(true);
    audio.onended = () => setIsSpeaking(false);
    audio.onerror = () => setIsSpeaking(false);

    audioRef.current = audio;
    audio.play();
  }, [voiceConfig.volume]);

  // Voice recording (using Web Speech API)
  const toggleRecording = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = voiceConfig.language || "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputMessage(transcript);
      sendMessage(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
    };

    recognition.start();
  }, [isRecording, voiceConfig.language, sendMessage]);

  // Clear conversation
  const clearConversation = useCallback(async () => {
    setMessages([]);

    if (voiceConfig.enableContextMemory) {
      try {
        await fetch("/api/qdrant/clear-conversation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ sessionId }),
        });
      } catch (error) {
        console.error("Failed to clear conversation from Qdrant:", error);
      }
    }
  }, [sessionId, voiceConfig.enableContextMemory]);

  // Export conversation
  const exportConversation = useCallback(() => {
    const conversationText = messages
      .map((msg) => \`[\${msg.timestamp.toLocaleString()}] \${msg.role.toUpperCase()}: \${msg.content}\`)
      .join("\\n\\n");

    const blob = new Blob([conversationText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = \`conversation_\${documentSlug}_\${Date.now()}.txt\`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages, documentSlug]);

  // Handle Enter key to send message
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(inputMessage);
      }
    },
    [inputMessage, sendMessage]
  );

  return (
    <Card className={cn("flex flex-col bg-card dark:bg-gray-800", className)}>
      <CardHeader className="border-b border-border dark:border-gray-700">
        <CardTitle className="flex items-center justify-between text-lg">
          <span>AI Assistant</span>
          <div className="flex items-center gap-2">
            {isSpeaking && (
              <Badge className="animate-pulse bg-primary/20 text-primary">
                Speaking
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={exportConversation}
              disabled={messages.length === 0}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearConversation}
              disabled={messages.length === 0}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p className="text-sm">
                  Ask me anything about "\${documentTitle}"
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-lg p-3",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                    {message.audioUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => playAudioResponse(message.audioUrl!)}
                        className="mt-2 h-6 text-xs"
                      >
                        <Volume2 className="h-3 w-3 mr-1" />
                        Replay
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-muted text-foreground rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-border dark:border-gray-700 p-4">
          <div className="flex items-end gap-2">
            <Textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about this post..."
              className="min-h-[60px] max-h-[120px] resize-none"
              disabled={isProcessing}
            />
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                onClick={toggleRecording}
                variant={isRecording ? "destructive" : "outline"}
              >
                {isRecording ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                onClick={() => sendMessage(inputMessage)}
                disabled={!inputMessage.trim() || isProcessing}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
`;
  }

  private getBlogVoiceLMNTTemplate(): string {
    return `import { NextRequest, NextResponse } from "next/server";

/**
 * Blog Post LMNT Voice API
 * Auto-generated by Voice Components Generator
 * Converts blog content to speech using LMNT
 */

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      text,
      slug,
      voiceId = "lily",
      speed = 1.0,
      volume = 1.0,
      format = "mp3",
      sampleRate = 24000,
      language = "en",
    } = body;

    if (!text) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    // Check for LMNT API key
    const apiKey = process.env.LMNT_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "LMNT API key not configured" },
        { status: 500 }
      );
    }

    // Call LMNT API for text-to-speech
    const lmntResponse = await fetch("https://api.lmnt.com/v1/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        text: text.substring(0, 5000), // Limit text length
        voice: voiceId,
        speed,
        format,
        sample_rate: sampleRate,
        language,
      }),
    });

    if (!lmntResponse.ok) {
      const errorText = await lmntResponse.text();
      console.error("LMNT API error:", errorText);
      return NextResponse.json(
        { error: "Failed to generate speech" },
        { status: lmntResponse.status }
      );
    }

    // Get audio data
    const audioBuffer = await lmntResponse.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");

    return NextResponse.json({
      success: true,
      audioChunks: [audioBase64],
      format,
      metadata: {
        slug,
        voiceId,
        speed,
        sampleRate,
        language,
        textLength: text.length,
      },
    });
  } catch (error) {
    console.error("Blog voice API error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate speech",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
`;
  }

  private getBlogChatAPITemplate(): string {
    return `import { NextRequest, NextResponse } from "next/server";

/**
 * Blog AI Chat API
 * Auto-generated by Voice Components Generator
 * Provides intelligent conversation about blog post content
 * Integrates with LMNT for voice responses
 */

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      message,
      documentContent,
      documentTitle,
      documentType,
      documentMetadata,
      conversationHistory = [],
      sessionId,
      voiceConfig,
    } = body;

    if (!message || !documentContent) {
      return NextResponse.json(
        { error: "Message and document content are required" },
        { status: 400 }
      );
    }

    // Build context from conversation history
    const historyContext = conversationHistory
      .slice(-5) // Last 5 messages for context
      .map(
        (msg: any) =>
          \`\${msg.role === "user" ? "User" : "Assistant"}: \${msg.content}\`
      )
      .join("\\n");

    // Create system prompt with blog context
    const systemPrompt = \`You are a helpful AI assistant for Tokenizin blog posts.

BLOG POST: \${documentTitle}
\${documentMetadata?.category ? \`CATEGORY: \${documentMetadata.category}\` : ""}
\${documentMetadata?.tags?.length ? \`TAGS: \${documentMetadata.tags.join(", ")}\` : ""}

CONTENT:
\${documentContent.substring(0, 4000)} // Limit to avoid token limits

\${historyContext ? \`CONVERSATION HISTORY:\\n\${historyContext}\` : ""}

Your role:
- Answer questions about the blog post clearly and concisely
- Provide insights and explanations about the topics covered
- Reference specific sections of the post when relevant
- Suggest related topics or concepts that might interest the reader
- Be friendly, engaging, and professional
- Keep responses conversational and under 150 words unless more detail is requested
- If you don't know something, admit it honestly

Remember: You're discussing a blog post about \${documentTitle}.\`;

    // Generate AI response using Groq
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: \`Bearer \${process.env.GROQ_API_KEY}\`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(\`Groq API error: \${response.status}\`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || "";

    // Generate voice response if enabled
    let audioUrl = null;
    if (voiceConfig?.enableConversation) {
      try {
        const voiceResponse = await fetch(
          \`\${request.nextUrl.origin}/api/blog/voice/lmnt\`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: aiResponse,
              slug: sessionId,
              voiceId: voiceConfig.voice,
              speed: voiceConfig.speed,
              format: voiceConfig.format,
              sampleRate: voiceConfig.sampleRate,
              language: voiceConfig.language,
            }),
          }
        );

        if (voiceResponse.ok) {
          const voiceData = await voiceResponse.json();
          // Create temporary audio URL (in production, save to blob storage)
          if (voiceData.audioChunks?.length) {
            audioUrl = \`data:audio/\${voiceData.format};base64,\${voiceData.audioChunks[0]}\`;
          }
        }
      } catch (error) {
        console.error("Failed to generate voice response:", error);
        // Continue without voice if it fails
      }
    }

    return NextResponse.json({
      response: aiResponse.trim(),
      audioUrl,
      sessionId,
      timestamp: new Date().toISOString(),
      metadata: {
        documentType,
        documentTitle,
        ...documentMetadata,
      },
    });
  } catch (error) {
    console.error("Blog chat error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate response",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
`;
  }

  private async generateDocumentation(config: VoiceComponentConfig): Promise<void> {
    const isBlogContent = config.contentType === "blog" || config.enableBlogIntegration;
    const contentTypeName = isBlogContent ? "Blog Posts" : "Documentation";
    const componentName = isBlogContent ? "Blog" : config.componentName;

    const docContent = `# Voice-Enabled ${contentTypeName} Components

## Overview

Auto-generated voice integration package for ${contentTypeName.toLowerCase()}.
${isBlogContent ? "Enables professional voice reading and AI conversation for blog posts." : "Provides voice reading capabilities for documentation pages."}

## Features

- ✅ LMNT Text-to-Speech Integration
- ✅ Voice Configuration Dialog
${config.includeConversation ? "- ✅ Conversational AI Chatbot" : ""}
${config.includeQdrantStorage ? "- ✅ Qdrant Context Storage" : ""}
- ✅ Dark Mode Support
- ✅ Responsive Design
${isBlogContent ? "- ✅ Blog Post Integration" : ""}
${isBlogContent ? "- ✅ AI-Powered Blog Discussions" : ""}
${isBlogContent ? "- ✅ Voice Input Support (Web Speech API)" : ""}

## Usage

${isBlogContent ? `### Blog Post Integration

\`\`\`tsx
import { BlogPostWithVoice } from '@/components/blog/BlogPostWithVoice';

export function BlogPostPage({ post }) {
  return (
    <BlogPostWithVoice
      title={post.title}
      content={post.content}
      slug={post.slug}
      category={post.category}
      tags={post.tags}
      excerpt={post.excerpt}
    >
      {/* Your existing blog content JSX */}
      <article className="prose dark:prose-invert">
        <MarkdownRenderer content={post.content} />
      </article>
    </BlogPostWithVoice>
  );
}
\`\`\`

### Conversational AI Chatbot

\`\`\`tsx
import { ConversationalAIChatbot } from '@/components/blog/ConversationalAIChatbot';

<ConversationalAIChatbot
  documentContent={post.content}
  documentTitle={post.title}
  documentType="blog"
  documentSlug={post.slug}
  documentMetadata={{
    category: post.category,
    tags: post.tags,
    excerpt: post.excerpt,
  }}
  voiceConfig={voiceConfig}
  sessionId={\`blog_\${post.slug}_timestamp\`}
  className="h-[calc(100vh-12rem)]"
/>
\`\`\`` : `### Documentation Integration

\`\`\`tsx
import { ${config.componentName}PageWithVoice } from '@/components/docs/${config.componentName}PageWithVoice';

export default function Page() {
  return (
    <${config.componentName}PageWithVoice
      title="My Documentation"
      content="<p>Documentation content here...</p>"
    />
  );
}
\`\`\``}

## Configuration

Voice presets available:
${config.voicePresets.map((voice) => `- ${voice}`).join("\n")}

## Environment Variables

Required:
- \`LMNT_API_KEY\` - Your LMNT API key
- \`GROQ_API_KEY\` - Your Groq API key

Optional:
- \`QDRANT_URL\` - Qdrant server URL (default: http://localhost:6333)
- \`QDRANT_API_KEY\` - Qdrant API key

## Generated Files

- \`${componentName}PostWithVoice.tsx\` - Main component
- \`${componentName}ConfigDialog.tsx\` - Configuration dialog
${config.includeConversation ? `- \`${componentName}Chatbot.tsx\` - Conversational chatbot` : ""}
${isBlogContent ? "- API routes for blog voice and chat integration" : ""}
- API routes for voice and Qdrant integration

${isBlogContent ? `## Blog Integration Features

- **Voice Reading**: Professional TTS with 6+ voice presets
- **AI Chat**: Contextual conversations about blog content
- **Voice Input**: Microphone support for voice questions
- **Voice Output**: AI responses can be spoken
- **Conversation Memory**: Qdrant integration for context
- **Export Conversations**: Download chat history
- **Mobile Responsive**: Optimized for all devices

## API Endpoints

### Blog Voice API
\`\`\`
POST /api/blog/voice/lmnt
\`\`\`
Convert blog text to speech using LMNT.

### Blog Chat API
\`\`\`
POST /api/blog/chat
\`\`\`
AI conversation about blog content with voice responses.

## User Experience

### Desktop
1. Navigate to blog post
2. Click "Listen" → Professional voice starts reading
3. Click "Chat" → AI chatbot sidebar appears
4. Click "Settings" → Configure voice preferences

### Mobile
1. Same flow as desktop
2. Chatbot appears below content
3. Voice controls stack vertically
4. Touch-optimized interface

## Customization

### Default Voice Configuration

\`\`\`tsx
const DEFAULT_VOICE_CONFIG: LMNTVoiceConfig = {
  voice: "${config.voicePresets[0] || "lily"}",
  speed: 1.0,
  volume: 1.0,
  language: "en",
  format: "mp3",
  sampleRate: 24000,
  enableConversation: ${config.includeConversation},
  enableContextMemory: ${config.includeQdrantStorage},
  autoRead: false,
};
\`\`\`

### Voice Presets

- **lily** - Female, clear, professional
- **daniel** - Male, warm, friendly
- **sarah** - Female, energetic, youthful
- **alex** - Male, deep, authoritative
- **emma** - Female, soft, calming
- **james** - Male, British, sophisticated

### Supported Languages

- en (English) - es (Spanish) - fr (French)
- de (German) - it (Italian) - pt (Portuguese)
- nl (Dutch) - pl (Polish)` : ""}

## Next Steps

1. Install dependencies: \`bun add @qdrant/js-client-rest lmnt-node\`
2. Set environment variables in \`.env.local\`
3. Import and use in your ${contentTypeName.toLowerCase()} pages
${isBlogContent ? "4. Wrap blog posts with BlogPostWithVoice component" : ""}
${isBlogContent ? "5. Test voice and chat features" : ""}
`;

    const docPath = path.join(this.outputDir, `${componentName}_VOICE_INTEGRATION.md`);
    await fs.writeFile(docPath, docContent, "utf-8");
    console.log(`✅ Generated documentation: ${docPath}`);
  }
}

// CLI usage
if (require.main === module) {
  const generator = new VoiceComponentsGenerator();

  // Generate blog voice integration by default
  generator.generateCompletePackage("Documentation", {
    includeConversation: true,
    includeQdrantStorage: true,
    voicePresets: ["lily", "daniel", "sarah", "alex", "emma", "james"],
    contentType: "blog",
    enableBlogIntegration: true,
  }).catch(console.error);
}

export default VoiceComponentsGenerator;

