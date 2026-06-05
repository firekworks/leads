import { NextResponse } from "next/server";
import { requireInternalUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: Params) {
  const auth = await requireInternalUser(request);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const [activities, tasks, notes] = await Promise.all([
    auth.admin.from("lead_activities").select("*").eq("lead_id", id).order("occurred_at", { ascending: false }).limit(50),
    auth.admin.from("lead_tasks").select("*").eq("lead_id", id).order("due_at", { ascending: true }).limit(50),
    auth.admin.from("lead_notes").select("*").eq("lead_id", id).order("created_at", { ascending: false }).limit(50)
  ]);

  const error = activities.error || tasks.error || notes.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    activities: (activities.data || []).map((item) => ({
      id: item.id,
      leadId: item.lead_id,
      userId: item.user_id || "",
      type: item.type,
      occurredAt: item.occurred_at,
      result: item.result || "",
      nextAction: item.next_action || "",
      reminderAt: item.reminder_at || "",
      fileUrl: item.file_url || "",
      createdAt: item.created_at
    })),
    tasks: (tasks.data || []).map((item) => ({
      id: item.id,
      leadId: item.lead_id,
      userId: item.user_id || "",
      type: item.type,
      title: item.title,
      description: item.description || "",
      dueAt: item.due_at || "",
      priority: item.priority,
      status: item.status,
      completedAt: item.completed_at || "",
      createdAt: item.created_at,
      updatedAt: item.updated_at
    })),
    notes: (notes.data || []).map((item) => ({
      id: item.id,
      leadId: item.lead_id,
      userId: item.user_id || "",
      note: item.note,
      pinned: Boolean(item.pinned),
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }))
  });
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requireInternalUser(request, { write: true });
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const body = (await request.json()) as {
    activity?: {
      type?: string;
      result?: string;
      nextAction?: string;
      reminderAt?: string;
    };
    task?: {
      type?: string;
      title?: string;
      description?: string;
      dueAt?: string;
      priority?: string;
    };
    note?: {
      note?: string;
      pinned?: boolean;
    };
  };

  if (body.activity) {
    const { error } = await auth.admin.from("lead_activities").insert({
      lead_id: id,
      user_id: auth.user.id,
      type: body.activity.type || "nota",
      result: body.activity.result || "",
      next_action: body.activity.nextAction || "",
      reminder_at: body.activity.reminderAt || null
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (body.activity.nextAction || body.activity.reminderAt) {
      await auth.admin
        .from("leads")
        .update({
          next_action: body.activity.nextAction || "",
          next_follow_up_at: body.activity.reminderAt || null,
          next_follow_up_type: body.activity.type || "seguimiento"
        })
        .eq("id", id);
    }
  }

  if (body.task) {
    const { error } = await auth.admin.from("lead_tasks").insert({
      lead_id: id,
      user_id: auth.user.id,
      type: body.task.type || "seguimiento",
      title: body.task.title || "Seguimiento",
      description: body.task.description || "",
      due_at: body.task.dueAt || null,
      priority: body.task.priority || "Media"
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.note?.note) {
    const { error } = await auth.admin.from("lead_notes").insert({
      lead_id: id,
      user_id: auth.user.id,
      note: body.note.note,
      pinned: Boolean(body.note.pinned)
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return GET(request, { params: Promise.resolve({ id }) });
}
