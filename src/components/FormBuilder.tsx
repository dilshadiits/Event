import React, { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';

export type FieldType = 'text' | 'select' | 'checkbox' | 'email' | 'phone' | 'number';

export interface FormField {
    id: string;
    label: string;
    type: FieldType;
    required: boolean;
    options?: string[]; // For select type
    enabled: boolean;
    isSystem: boolean;
}

interface FormBuilderProps {
    fields: FormField[];
    onChange: (fields: FormField[]) => void;
}

// Default system fields that cannot be removed, only disabled (except name/phone which are mandatory)
export const SYSTEM_FIELDS_DEFAULTS: FormField[] = [
    { id: 'email', label: 'Email Address', type: 'email', required: false, enabled: true, isSystem: true },
    { id: 'instagram', label: 'Instagram Handle', type: 'text', required: false, enabled: true, isSystem: true },
    { id: 'youtube', label: 'YouTube Channel', type: 'text', required: false, enabled: true, isSystem: true },
    { id: 'category', label: 'Attendee Category', type: 'select', required: false, enabled: true, isSystem: true, options: ['Guest', '5k to 10k', '10k to 100k', '100k to 500k', '500k to 1m', '1m plus'] },
    { id: 'meal_preference', label: 'Meal Preference', type: 'select', required: true, enabled: true, isSystem: true, options: ['veg', 'non-veg'] },
];

export default function FormBuilder({ fields, onChange }: FormBuilderProps) {
    // If no fields provided (new event), merge with defaults
    const [localFields, setLocalFields] = useState<FormField[]>(() => {
        if (!fields || fields.length === 0) return JSON.parse(JSON.stringify(SYSTEM_FIELDS_DEFAULTS));

        // Ensure all system defaults exist in partial configs
        const currentIds = new Set(fields.map(f => f.id));
        const missingDefaults = SYSTEM_FIELDS_DEFAULTS.filter(f => !currentIds.has(f.id));
        return [...fields, ...missingDefaults];
    });

    const updateField = (index: number, updates: Partial<FormField>) => {
        const newFields = [...localFields];
        newFields[index] = { ...newFields[index], ...updates };
        setLocalFields(newFields);
        onChange(newFields);
    };

    const addCustomField = () => {
        const newField: FormField = {
            id: `custom_${Date.now()}`,
            label: 'New Question',
            type: 'text',
            required: false,
            enabled: true,
            isSystem: false,
            options: [] // Initialize for select types
        };
        const newFields = [...localFields, newField];
        setLocalFields(newFields);
        onChange(newFields);
    };

    const removeField = (index: number) => {
        const newFields = localFields.filter((_, i) => i !== index);
        setLocalFields(newFields);
        onChange(newFields);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Registration Form Fields</h3>
                <button
                    onClick={addCustomField}
                    className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Question
                </button>
            </div>

            <p className="text-xs text-muted-foreground">
                Configure what information attendees provide during registration.
                &quot;Name&quot; and &quot;Phone&quot; are always required and cannot be modified.
            </p>

            <div className="space-y-3">
                {localFields.map((field, index) => (
                    <div
                        key={field.id}
                        className={`bg-card/50 border ${field.enabled ? 'border-border' : 'border-border/50 opacity-60'} rounded-lg p-4 transition-all hover:border-blue-500/50`}
                    >
                        {/* Header Row */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab active:cursor-grabbing" />
                                <div className="flex flex-col">
                                    <input
                                        type="text"
                                        value={field.label}
                                        onChange={(e) => updateField(index, { label: e.target.value })}
                                        disabled={field.isSystem} // System labels (like Email) usually fixed, but maybe allow rename? let's disable for consistency
                                        className={`bg-transparent text-sm font-medium focus:outline-none focus:border-b border-blue-500 ${field.isSystem ? 'text-blue-300' : 'text-white'}`}
                                    />
                                    {field.isSystem && <span className="text-[10px] text-blue-400/70 uppercase tracking-wider">System Field</span>}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={field.required}
                                        onChange={(e) => updateField(index, { required: e.target.checked })}
                                        disabled={field.isSystem && field.id === 'meal_preference'} // Force meal preference? Maybe let user decide.
                                        className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-offset-gray-900"
                                    />
                                    Required
                                </label>

                                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer border-l border-border pl-3">
                                    <input
                                        type="checkbox"
                                        checked={field.enabled}
                                        onChange={(e) => updateField(index, { enabled: e.target.checked })}
                                        className="rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-offset-gray-900"
                                    />
                                    Enable
                                </label>

                                {!field.isSystem && (
                                    <button
                                        onClick={() => removeField(index)}
                                        className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded"
                                        title="Delete Question"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Config Row (for custom fields or configurable system fields) */}
                        {field.enabled && (
                            <div className="pl-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">Answer Type</label>
                                    <select
                                        value={field.type}
                                        onChange={(e) => updateField(index, { type: e.target.value as FieldType })}
                                        disabled={field.isSystem}
                                        className="w-full bg-muted border border-border rounded px-2 py-1.5 text-xs text-white focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="text">Short Text</option>
                                        <option value="email">Email</option>
                                        <option value="phone">Phone Number</option>
                                        <option value="number">Number</option>
                                        <option value="select">Dropdown Selection</option>
                                        <option value="checkbox">Checkbox (Yes/No)</option>
                                    </select>
                                </div>

                                {(field.type === 'select') && (
                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">Options (comma separated)</label>
                                        <input
                                            type="text"
                                            value={field.options?.join(', ') || ''}
                                            onChange={(e) => updateField(index, { options: e.target.value.split(',').map(s => s.trim()) })}
                                            placeholder="Option 1, Option 2, Option 3"
                                            className="w-full bg-muted border border-border rounded px-2 py-1.5 text-xs text-white focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {localFields.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                        No fields configured. Add one to get started.
                    </div>
                )}
            </div>
        </div>
    );
}
