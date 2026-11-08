import React, { useState, useMemo } from 'react';
import { Plus, Search, BookOpen, Filter } from 'lucide-react';
import { useStudy } from '@/context/StudyContext';
import { Subject, DifficultyLevel } from '@/types';
import { Button } from '../common/Button';
import { SubjectCard } from './SubjectCard';
import { SubjectFormModal } from './SubjectFormModal';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface SubjectsViewProps {
  onNavigateToPlanner: () => void;
}

export function SubjectsView({ onNavigateToPlanner }: SubjectsViewProps) {
  const { subjects, addSubject, updateSubject, deleteSubject } = useStudy();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | DifficultyLevel>('all');

  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.topics.some((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDifficulty =
        difficultyFilter === 'all' || s.difficulty === difficultyFilter;

      return matchesSearch && matchesDifficulty;
    });
  }, [subjects, searchQuery, difficultyFilter]);

  const handleOpenCreate = () => {
    setEditingSubject(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setIsModalOpen(true);
  };

  const handleFormSubmit = (data: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingSubject) {
      updateSubject(editingSubject.id, data);
    } else {
      addSubject(data);
    }
  };

  const handleConfirmDelete = () => {
    if (subjectToDelete) {
      deleteSubject(subjectToDelete.id);
      setSubjectToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3 max-w-md">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search subjects or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search subjects or topics"
              className="block w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2 text-sm text-slate-900 shadow-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value as 'all' | DifficultyLevel)}
              aria-label="Filter subjects by difficulty"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy Only</option>
              <option value="medium">Medium Only</option>
              <option value="hard">Hard Only</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={handleOpenCreate}
          >
            Add Subject
          </Button>
        </div>
      </div>

      {/* Subjects Grid */}
      {subjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-400">
            <BookOpen className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
            No subjects created yet
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Get started by adding your courses, examination dates, and topics. StudyFlow AI uses this data to organize your daily schedule.
          </p>
          <div className="mt-6">
            <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
              Create Your First Subject
            </Button>
          </div>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No subjects match your search or filter criteria.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={() => {
              setSearchQuery('');
              setDifficultyFilter('all');
            }}
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredSubjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              onEdit={handleOpenEdit}
              onDelete={(id) => {
                const target = subjects.find((s) => s.id === id);
                if (target) setSubjectToDelete(target);
              }}
            />
          ))}
        </div>
      )}

      {/* Subject Add/Edit Modal */}
      <SubjectFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingSubject}
      />

      {/* Accessible Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(subjectToDelete)}
        onClose={() => setSubjectToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Subject"
        message={`Are you sure you want to delete "${subjectToDelete?.name}"? All associated topics will be removed from future planning.`}
        confirmLabel="Delete Subject"
        isDestructive={true}
      />
    </div>
  );
}

