// Converts Mongoose documents into the JSON shape the React app consumes.

const iso = (d: unknown) => (d ? new Date(d as any).toISOString() : null);

export function serializeRep(u: any) {
  if (!u || !u.name) return null;
  return { id: String(u._id || u.id), name: u.name, email: u.email, role: u.role };
}

export function serializeLead(doc: any) {
  const o = doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const byNewest = (a: any, b: any) => +new Date(b.createdAt) - +new Date(a.createdAt);
  return {
    id: String(o._id),
    formId: o.formId,
    name: o.name,
    email: o.email,
    phone: o.phone || '',
    company: o.company || '',
    source: o.source,
    sourcePage: o.sourcePage || '',
    subject: o.subject || '',
    message: o.message || '',
    status: o.status,
    priority: o.priority,
    tier: o.tier,
    dealValue: o.dealValue || 0,
    declaredBudget: o.declaredBudget || '',
    targetTimeline: o.targetTimeline || '',
    assignedRep: serializeRep(o.assignedTo),
    ip: o.ip || '',
    referrer: o.referrer || '',
    receivedAt: iso(o.receivedAt),
    firstContactedAt: iso(o.firstContactedAt),
    convertedAt: iso(o.convertedAt),
    nextFollowUpAt: iso(o.nextFollowUpAt),
    notes: [...(o.notes || [])].sort(byNewest).map((n: any) => ({
      id: String(n._id),
      type: n.type,
      author: n.author,
      content: n.content,
      metadata: n.metadata || undefined,
      createdAt: iso(n.createdAt)
    })),
    activityHistory: [...(o.activityHistory || [])].sort(byNewest).map((a: any) => ({
      id: String(a._id),
      type: a.type,
      title: a.title,
      detail: a.detail || '',
      author: a.author,
      fromStage: a.fromStage || undefined,
      toStage: a.toStage || undefined,
      duration: a.duration || undefined,
      createdAt: iso(a.createdAt)
    }))
  };
}

export function serializeTask(doc: any) {
  const o = doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    id: String(o._id),
    leadId: String(o.lead),
    leadName: o.leadName,
    company: o.company || '',
    title: o.title,
    description: o.description || '',
    dueAt: iso(o.dueAt),
    isUrgent: !!o.isUrgent,
    completed: !!o.completed,
    completedAt: iso(o.completedAt)
  };
}
