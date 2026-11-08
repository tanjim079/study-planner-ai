import React, { useState, useEffect } from 'react';
import { Plus, Trash2, BookOpen, Clock } from 'lucide-react';
import { Subject, DifficultyLevel, PriorityLevel, Topic } from '@/types';
import { generateId, getTodayIso } from '@/lib/utils';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { CreateSubjectInputSchema } from '@/lib/schemas';

interface SubjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (subject: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>) => void;
  initialData?: Subject | null;
}

export function SubjectFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: SubjectFormModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [deadline, setDeadline] = useState(getTodayIso());
  const [topics, setTopics] = useState<{ id: string; name: string; estimatedMinutes: number }[]>([
    { id: generateId('topic'), name: '', estimatedMinutes: 60 },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || '');
      setDifficulty(initialData.difficulty);
      setPriority(initialData.priority);
      setDeadline(initialData.deadline);
      setTopics(
        initialData.topics.length > 0
          ? initialData.topics.map((t) => ({ ...t }))
          : [{ id: generateId('topic'), name: '', estimatedMinutes: 60 }]
      );
    } else {
      setName('');
      setDescription('');
      setDifficulty('medium');
      setPriority('medium');
      setDeadline(getTodayIso());
      setTopics([{ id: generateId('topic'), name: '', estimatedMinutes: 60 }]);
    }
    setErrors({});
  }, [initialData, isOpen]);

  const handleAddTopic = () => {
    setTopics((prev) => [...prev, { id: generateId('topic'), name: '', estimatedMinutes: 45 }]);
  };

  const handleRemoveTopic = (index: number) => {
    if (topics.length <= 1) {
      setErrors((prev) => ({ ...prev, topics: 'At least one topic is required.' }));
      return;
    }
    setTopics((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTopicChange = (
    index: number,
    field: 'name' | 'estimatedMinutes',
    value: string | number
  ) => {
    setTopics((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const formData = {
      name,
      description,
      difficulty,
      deadline,
      priority,
      topics: topics.map((t) => ({
        name: t.name.trim(),
        estimatedMinutes: Number(t.estimatedMinutes) || 0,
      })),
    };

    const result = CreateSubjectInputSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const path = err.path.join('.');
        fieldErrors[path] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const cleanedTopics: Topic[] = topics.map((t) => ({
      id: t.id || generateId('topic'),
      name: t.name.trim(),
      estimatedMinutes: Number(t.estimatedMinutes),
      completed: false,
    }));

    onSubmit({
      name: name.trim(),
      description: description.trim(),
      difficulty,
      priority,
      deadline,
      topics: cleanedTopics,
      color: initialData?.color,
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Subject' : 'Add New Subject'}
      description="Enter course details, examination deadlines, and topics to study."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Subject Name */}
        <Input
          label="Subject Name"
          placeholder="e.g. Advanced Calculus, Operating Systems"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors['name']}
          required
        />

        {/* Description */}
        <div>
          <label
            htmlFor="subject-description"
            className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1"
          >
            Description (Optional)
          </label>
          <textarea
            id="subject-description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Course details, textbook, syllabus coverage..."
            className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        {/* Difficulty & Priority */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="subject-difficulty"
              className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1"
            >
              Difficulty Level <span className="text-rose-500">*</span>
            </label>
            <select
              id="subject-difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="easy">Easy (Quick review)</option>
              <option value="medium">Medium (Standard pace)</option>
              <option value="hard">Hard (Needs extra depth & practice)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="subject-priority"
              className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1"
            >
              Priority Level <span className="text-rose-500">*</span>
            </label>
            <select
              id="subject-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as PriorityLevel)}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
          </div>
        </div>

        {/* Examination / Assignment Deadline */}
        <Input
          label="Deadline (Exam or Assignment Date)"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          error={errors['deadline']}
          required
        />

        {/* Topics List Editor */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Study Topics & Estimated Durations
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Break this subject down into individual units or chapters.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={handleAddTopic}
            >
              Add Topic
            </Button>
          </div>

          {errors['topics'] && (
            <p className="text-xs text-rose-600 dark:text-rose-400 mb-2" role="alert">
              {errors['topics']}
            </p>
          )}

          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {topics.map((topic, index) => (
              <div
                key={topic.id}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="flex-1">
                  <input
                    type="text"
                    value={topic.name}
                    onChange={(e) => handleTopicChange(index, 'name', e.target.value)}
                    placeholder={`Topic #${index + 1} name (e.g. Limits & Continuity)`}
                    aria-label={`Topic ${index + 1} name`}
                    className="block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                  {errors[`topics.${index}.name`] && (
                    <p className="text-[11px] text-rose-500 mt-1">
                      {errors[`topics.${index}.name`]}
                    </p>
                  )}
                </div>

                <div className="w-24">
                  <div className="relative">
                    <input
                      type="number"
                      min={10}
                      max={480}
                      step={5}
                      value={topic.estimatedMinutes}
                      onChange={(e) =>
                        handleTopicChange(index, 'estimatedMinutes', Number(e.target.value))
                      }
                      aria-label={`Topic ${index + 1} duration in minutes`}
                      className="block w-full rounded-md border border-slate-300 bg-white pr-7 pl-2.5 py-1.5 text-xs text-slate-900 shadow-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px] text-slate-400">
                      min
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveTopic(index)}
                  aria-label={`Remove topic ${topic.name || index + 1}`}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {initialData ? 'Save Changes' : 'Create Subject'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

