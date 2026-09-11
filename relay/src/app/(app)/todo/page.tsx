'use client';

import { WeeklyTodoList } from '@/components/todos/weekly-todo-list';
import { PageHeader } from '@/components/ui/page-header';

export default function TodoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <PageHeader title="To Do" subtitle="Your week, one day at a time." />
      <div className="mt-6"><WeeklyTodoList /></div>
    </div>
  );
}
