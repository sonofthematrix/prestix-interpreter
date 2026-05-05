"use client";

import { LinkGenerationForm } from "@/components/hub/links/LinkGenerationForm";

export default function NewLinkPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">Create New Link</h1>
          <p className="mt-2 text-muted-foreground">Generate a magic link for your audience</p>
        </div>
      </div>
      <LinkGenerationForm />
    </div>
  );
}