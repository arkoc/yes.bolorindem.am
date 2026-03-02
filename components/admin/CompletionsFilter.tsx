"use client";

import L from "@/lib/labels";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { VolunteerSearch } from "./VolunteerSearch";
import { X } from "lucide-react";

interface CompletionsFilterProps {
  projects: { id: string; title: string }[];
  users: { id: string; full_name: string }[];
  selectedProjectId: string;
  selectedUserId: string;
}

export function CompletionsFilter({ projects, users, selectedProjectId, selectedUserId }: CompletionsFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function applyFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/admin/completions?${params.toString()}`);
  }

  const hasFilters = selectedProjectId || selectedUserId;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select
        value={selectedProjectId || "all"}
        onValueChange={(v) => applyFilter("project", v === "all" ? "" : v)}
      >
        <SelectTrigger className="w-48 h-9">
          <SelectValue placeholder={L.filter.allProjects} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{L.filter.allProjects}</SelectItem>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <VolunteerSearch
        users={users}
        value={selectedUserId}
        onChange={(id) => applyFilter("user", id)}
        placeholder={L.filter.searchVolunteer}
        className="w-48"
      />

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/admin/completions")}
          className="h-9 gap-1 text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" />
          {L.filter.clear}
        </Button>
      )}
    </div>
  );
}
