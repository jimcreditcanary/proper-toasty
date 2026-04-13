"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type EditorState = {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  published: boolean;
};

const CATEGORIES = [
  "Fraud Prevention",
  "Guides",
  "News",
  "Safety",
  "Business",
];

const EMPTY_EDITOR: EditorState = {
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  category: "Guides",
  author: "WhoAmIPaying",
  published: false,
};

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AdminBlogManager({ posts }: { posts: BlogPost[] }) {
  const router = useRouter();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function openNew() {
    setEditor({ ...EMPTY_EDITOR });
    setError(null);
  }

  async function openEdit(post: BlogPost) {
    setError(null);
    // Fetch full content
    const res = await fetch(`/api/admin/blog/${post.id}`);
    if (!res.ok) {
      setError("Failed to load post");
      return;
    }
    const data = await res.json();
    setEditor({
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: data.content,
      category: post.category,
      author: post.author,
      published: post.published,
    });
  }

  async function handleSave() {
    if (!editor) return;
    if (!editor.title.trim() || !editor.slug.trim()) {
      setError("Title and slug are required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/blog", {
        method: editor.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editor),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        setSaving(false);
        return;
      }

      setEditor(null);
      router.refresh();
    } catch {
      setError("An error occurred");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    setDeleting(id);

    try {
      await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
      router.refresh();
    } catch {
      setError("Failed to delete");
    }
    setDeleting(null);
  }

  async function handleTogglePublish(post: BlogPost) {
    await fetch("/api/admin/blog", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: post.id,
        published: !post.published,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content: "",
        category: post.category,
        author: post.author,
      }),
    });
    router.refresh();
  }

  // Editor view
  if (editor) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {editor.id ? "Edit post" : "New post"}
          </h2>
          <button
            onClick={() => setEditor(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="size-5" />
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={editor.title}
              onChange={(e) => {
                const title = e.target.value;
                setEditor((s) =>
                  s
                    ? {
                        ...s,
                        title,
                        slug: s.id ? s.slug : slugify(title),
                      }
                    : s
                );
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral/50 focus:border-coral"
              placeholder="Post title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Slug
            </label>
            <input
              type="text"
              value={editor.slug}
              onChange={(e) =>
                setEditor((s) => (s ? { ...s, slug: e.target.value } : s))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral/50 focus:border-coral"
              placeholder="url-friendly-slug"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Category
            </label>
            <select
              value={editor.category}
              onChange={(e) =>
                setEditor((s) => (s ? { ...s, category: e.target.value } : s))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral/50 focus:border-coral"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Author
            </label>
            <input
              type="text"
              value={editor.author}
              onChange={(e) =>
                setEditor((s) => (s ? { ...s, author: e.target.value } : s))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral/50 focus:border-coral"
              placeholder="Author name"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mt-6">
              <input
                type="checkbox"
                checked={editor.published}
                onChange={(e) =>
                  setEditor((s) =>
                    s ? { ...s, published: e.target.checked } : s
                  )
                }
                className="rounded border-slate-300"
              />
              Published
            </label>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Excerpt
            </label>
            <textarea
              value={editor.excerpt}
              onChange={(e) =>
                setEditor((s) => (s ? { ...s, excerpt: e.target.value } : s))
              }
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral/50 focus:border-coral"
              placeholder="Short description for the blog listing"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Content (Markdown)
            </label>
            <textarea
              value={editor.content}
              onChange={(e) =>
                setEditor((s) => (s ? { ...s, content: e.target.value } : s))
              }
              rows={20}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-coral/50 focus:border-coral"
              placeholder="Write your post in Markdown..."
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-10 px-5 bg-coral hover:bg-coral-dark text-white font-semibold text-sm rounded-lg"
          >
            {saving ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Save className="size-4 mr-2" />
            )}
            {editor.id ? "Update post" : "Create post"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setEditor(null)}
            className="h-10 px-5 text-sm rounded-lg border-slate-300"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-4">
      <Button
        onClick={openNew}
        className="h-10 px-5 bg-coral hover:bg-coral-dark text-white font-semibold text-sm rounded-lg"
      >
        <Plus className="size-4 mr-2" />
        New post
      </Button>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        {posts.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No blog posts yet. Create your first one.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                <th className="px-6 py-3">Title</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3.5">
                    <p className="font-medium text-slate-900 truncate max-w-xs">
                      {post.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">/{post.slug}</p>
                  </td>
                  <td className="px-6 py-3.5 text-slate-600">{post.category}</td>
                  <td className="px-6 py-3.5">
                    {post.published ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        <Eye className="size-3" />
                        Live
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                        <EyeOff className="size-3" />
                        Draft
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-slate-500">
                    {formatDate(post.published_at || post.created_at)}
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      {post.published && (
                        <a
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-coral"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      )}
                      <button
                        onClick={() => handleTogglePublish(post)}
                        className="text-slate-400 hover:text-coral"
                        title={post.published ? "Unpublish" : "Publish"}
                      >
                        {post.published ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                      <button
                        onClick={() => openEdit(post)}
                        className="text-slate-400 hover:text-coral"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="text-slate-400 hover:text-red-600"
                        disabled={deleting === post.id}
                      >
                        {deleting === post.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
