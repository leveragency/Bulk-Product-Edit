import React, { useState, useMemo, useCallback } from 'react';
import Papa from 'papaparse';
import { Upload, Download, Plus, Trash2, ChevronDown, FileSpreadsheet } from 'lucide-react';
import { cn } from './utils';
import { FilterCondition, Operator, EditActionType, EditAction, ShopifyProduct } from './types';

const OPERATORS: { value: Operator; label: string }[] = [
  { value: 'is', label: 'é igual a' },
  { value: 'is_not', label: 'não é igual a' },
  { value: 'contains', label: 'contém' },
  { value: 'does_not_contain', label: 'não contém' },
  { value: 'starts_with', label: 'começa com' },
  { value: 'ends_with', label: 'termina com' },
  { value: 'greater_than', label: 'maior que' },
  { value: 'less_than', label: 'menor que' },
];

const EDITABLE_FIELDS = [
  { value: 'Title', label: 'Título' },
  { value: 'Body (HTML)', label: 'Descrição (Body HTML)' },
  { value: 'Variant Price', label: 'Preço' },
  { value: 'Variant Compare At Price', label: 'Preço de Comparação' },
  { value: 'Tags', label: 'Tags' },
  { value: 'Vendor', label: 'Fornecedor' },
  { value: 'Type', label: 'Tipo de Produto' },
];

const FILTERABLE_FIELDS = [
  ...EDITABLE_FIELDS,
  { value: 'Handle', label: 'Handle (URL)' },
  { value: 'Option1 Value', label: 'Opção 1 (Valor)' },
  { value: 'Option2 Value', label: 'Opção 2 (Valor)' },
  { value: 'Option3 Value', label: 'Opção 3 (Valor)' },
  { value: 'Variant SKU', label: 'SKU' },
];

const TEXT_ACTIONS: { value: EditActionType; label: string }[] = [
  { value: 'add_beginning', label: 'adicionar texto no início' },
  { value: 'add_end', label: 'adicionar texto no final' },
  { value: 'find_replace', label: 'localizar e substituir texto' },
  { value: 'remove_text', label: 'localizar e remover texto' },
  { value: 'change_case', label: 'alterar maiúsculas/minúsculas' },
  { value: 'set_to', label: 'definir um novo valor' },
];

const NUMBER_ACTIONS: { value: EditActionType; label: string }[] = [
  { value: 'increase_by_amount', label: 'aumentar por valor fixo' },
  { value: 'decrease_by_amount', label: 'diminuir por valor fixo' },
  { value: 'increase_by_percent', label: 'aumentar por porcentagem (%)' },
  { value: 'decrease_by_percent', label: 'diminuir por porcentagem (%)' },
  { value: 'set_to', label: 'definir um novo valor' },
];

export default function App() {
  const [data, setData] = useState<ShopifyProduct[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  const [targetField, setTargetField] = useState<string>('Title');
  const [conditions, setConditions] = useState<FilterCondition[]>([
    { id: '1', field: 'Title', operator: 'contains', value: '' },
  ]);

  const [actionType, setActionType] = useState<EditActionType>('add_beginning');
  const [actionParams, setActionParams] = useState<Record<string, any>>({ text: '' });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setData(results.data as ShopifyProduct[]);
        if (results.meta.fields) {
          setHeaders(results.meta.fields);
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        alert('Falha ao processar o arquivo CSV.');
      },
    });
  };

  const addCondition = () => {
    setConditions([
      ...conditions,
      { id: Math.random().toString(36).substr(2, 9), field: 'Title', operator: 'contains', value: '' },
    ]);
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter((c) => c.id !== id));
  };

  const updateCondition = (id: string, key: keyof FilterCondition, value: string) => {
    setConditions(conditions.map((c) => (c.id === id ? { ...c, [key]: value } : c)));
  };

  const filteredData = useMemo(() => {
    if (!data.length) return [];

    return data.filter((row) => {
      return conditions.every((condition) => {
        if (!condition.value) return true; // Skip empty conditions

        const cellValue = String(row[condition.field] || '').toLowerCase();
        const filterValue = condition.value.toLowerCase();

        switch (condition.operator) {
          case 'is':
            return cellValue === filterValue;
          case 'is_not':
            return cellValue !== filterValue;
          case 'contains':
            return cellValue.includes(filterValue);
          case 'does_not_contain':
            return !cellValue.includes(filterValue);
          case 'starts_with':
            return cellValue.startsWith(filterValue);
          case 'ends_with':
            return cellValue.endsWith(filterValue);
          case 'greater_than':
            return parseFloat(cellValue) > parseFloat(filterValue);
          case 'less_than':
            return parseFloat(cellValue) < parseFloat(filterValue);
          default:
            return true;
        }
      });
    });
  }, [data, conditions]);

  const handleExecute = () => {
    if (!data.length || !filteredData.length) return;

    const modifiedData = data.map((row) => {
      // Check if row is in filtered data
      const isMatch = filteredData.some((fRow) => fRow.Handle === row.Handle && fRow['Option1 Value'] === row['Option1 Value']);
      
      if (!isMatch) return row;

      const newRow = { ...row };
      const currentValue = String(newRow[targetField] || '');

      switch (actionType) {
        case 'add_beginning':
          newRow[targetField] = `${actionParams.text || ''}${currentValue}`;
          break;
        case 'add_end':
          newRow[targetField] = `${currentValue}${actionParams.text || ''}`;
          break;
        case 'find_replace':
          newRow[targetField] = currentValue.split(actionParams.find || '').join(actionParams.replace || '');
          break;
        case 'remove_text':
          newRow[targetField] = currentValue.split(actionParams.text || '').join('');
          break;
        case 'change_case':
          if (actionParams.case === 'uppercase') newRow[targetField] = currentValue.toUpperCase();
          if (actionParams.case === 'lowercase') newRow[targetField] = currentValue.toLowerCase();
          break;
        case 'set_to':
          newRow[targetField] = actionParams.text || '';
          break;
        case 'increase_by_amount': {
          const num = parseFloat(currentValue) || 0;
          const inc = parseFloat(actionParams.amount) || 0;
          newRow[targetField] = (num + inc).toFixed(2);
          break;
        }
        case 'decrease_by_amount': {
          const num = parseFloat(currentValue) || 0;
          const dec = parseFloat(actionParams.amount) || 0;
          newRow[targetField] = Math.max(0, num - dec).toFixed(2);
          break;
        }
        case 'increase_by_percent': {
          const num = parseFloat(currentValue) || 0;
          const pct = parseFloat(actionParams.percent) || 0;
          newRow[targetField] = (num * (1 + pct / 100)).toFixed(2);
          break;
        }
        case 'decrease_by_percent': {
          const num = parseFloat(currentValue) || 0;
          const pct = parseFloat(actionParams.percent) || 0;
          newRow[targetField] = Math.max(0, num * (1 - pct / 100)).toFixed(2);
          break;
        }
      }

      return newRow;
    });

    // Generate new CSV
    const csv = Papa.unparse(modifiedData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `modified_${fileName || 'products.csv'}`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isPriceField = targetField.toLowerCase().includes('price');
  const availableActions = isPriceField ? NUMBER_ACTIONS : TEXT_ACTIONS;

  // Reset action type when switching field types
  React.useEffect(() => {
    if (isPriceField && !NUMBER_ACTIONS.some(a => a.value === actionType)) {
      setActionType('increase_by_amount');
    } else if (!isPriceField && !TEXT_ACTIONS.some(a => a.value === actionType)) {
      setActionType('add_beginning');
    }
  }, [targetField, isPriceField, actionType]);

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#212b36] font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b border-[#dfe3e8] px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="w-6 h-6 text-[#5c6ac4]" />
          <h1 className="text-xl font-semibold text-[#212b36]">Editor em Massa Shopify</h1>
        </div>
        {!data.length && (
          <label className="cursor-pointer bg-[#5c6ac4] hover:bg-[#475399] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Enviar CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </label>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto mt-8 px-4 space-y-6">
        {!data.length ? (
          <div className="bg-white rounded-lg shadow-sm border border-[#dfe3e8] p-12 text-center">
            <div className="w-16 h-16 bg-[#f4f6f8] rounded-full flex items-center justify-center mx-auto mb-4">
              <FileSpreadsheet className="w-8 h-8 text-[#919eab]" />
            </div>
            <h2 className="text-lg font-medium mb-2">Envie seu CSV de Produtos da Shopify</h2>
            <p className="text-[#637381] mb-6 max-w-md mx-auto">
              Exporte seus produtos da Shopify, envie o CSV aqui, defina suas regras de edição em massa e baixe o arquivo atualizado para importar de volta.
            </p>
            <label className="cursor-pointer bg-[#5c6ac4] hover:bg-[#475399] text-white px-6 py-3 rounded-md font-medium transition-colors inline-flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Selecionar Arquivo CSV
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        ) : (
          <>
            {/* Top Selector */}
            <div className="bg-white rounded-lg shadow-sm border border-[#dfe3e8] p-6">
              <label className="block text-sm font-medium text-[#212b36] mb-2">
                Selecione qual campo do produto ou variante deseja editar:
              </label>
              <div className="relative">
                <select
                  value={targetField}
                  onChange={(e) => setTargetField(e.target.value)}
                  className="w-full appearance-none bg-white border border-[#c4cdd5] rounded-md py-2 pl-4 pr-10 text-[#212b36] focus:outline-none focus:ring-2 focus:ring-[#5c6ac4] focus:border-transparent"
                >
                  {EDITABLE_FIELDS.map((field) => (
                    <option key={field.value} value={field.value}>
                      {field.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#637381]">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Step 1: Filter */}
            <div className="bg-white rounded-lg shadow-sm border border-[#dfe3e8] p-6">
              <h2 className="text-sm font-bold text-[#212b36] uppercase tracking-wider mb-4">
                Passo 1: Selecione quais produtos editar
              </h2>
              <p className="text-sm text-[#637381] mb-4">Os produtos devem corresponder a <span className="font-semibold text-[#212b36]">todas as seguintes condições</span></p>
              
              <div className="space-y-3 mb-4">
                {conditions.map((condition) => (
                  <div key={condition.id} className="flex items-center gap-3">
                    <select
                      value={condition.field}
                      onChange={(e) => updateCondition(condition.id, 'field', e.target.value)}
                      className="flex-1 appearance-none bg-white border border-[#c4cdd5] rounded-md py-2 px-3 text-sm focus:outline-none focus:border-[#5c6ac4]"
                    >
                      {FILTERABLE_FIELDS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                    <select
                      value={condition.operator}
                      onChange={(e) => updateCondition(condition.id, 'operator', e.target.value)}
                      className="w-40 appearance-none bg-white border border-[#c4cdd5] rounded-md py-2 px-3 text-sm focus:outline-none focus:border-[#5c6ac4]"
                    >
                      {OPERATORS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={condition.value}
                      onChange={(e) => updateCondition(condition.id, 'value', e.target.value)}
                      placeholder="Valor..."
                      className="flex-1 bg-white border border-[#c4cdd5] rounded-md py-2 px-3 text-sm focus:outline-none focus:border-[#5c6ac4]"
                    />
                    {conditions.length > 1 && (
                      <button
                        onClick={() => removeCondition(condition.id)}
                        className="p-2 text-[#637381] hover:text-[#d82c0d] transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addCondition}
                className="text-sm text-[#5c6ac4] hover:text-[#475399] font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Adicionar condição de filtro
              </button>
            </div>

            {/* Step 2: Preview */}
            <div className="bg-white rounded-lg shadow-sm border border-[#dfe3e8] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-[#212b36] uppercase tracking-wider">
                  Passo 2: Pré-visualizar produtos correspondentes
                </h2>
                <span className="text-sm text-[#637381] bg-[#f4f6f8] px-2 py-1 rounded">
                  {filteredData.length} linhas correspondentes
                </span>
              </div>
              
              <div className="overflow-x-auto border border-[#dfe3e8] rounded-md">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#f4f6f8] text-[#637381] border-b border-[#dfe3e8]">
                    <tr>
                      <th className="py-3 px-4 font-medium">Título</th>
                      <th className="py-3 px-4 font-medium">Variantes</th>
                      <th className="py-3 px-4 font-medium">Tipo</th>
                      <th className="py-3 px-4 font-medium">Fornecedor</th>
                      <th className="py-3 px-4 font-medium">Preço</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#dfe3e8]">
                    {filteredData.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-[#f9fafb]">
                        <td className="py-3 px-4 font-medium text-[#212b36] max-w-[200px] truncate" title={row.Title}>
                          {row.Title}
                        </td>
                        <td className="py-3 px-4 text-[#637381]">
                          {row['Option1 Value'] || 'Título Padrão'}
                        </td>
                        <td className="py-3 px-4 text-[#637381]">{row.Type}</td>
                        <td className="py-3 px-4 text-[#637381]">{row.Vendor}</td>
                        <td className="py-3 px-4 text-[#637381]">{row['Variant Price']}</td>
                      </tr>
                    ))}
                    {filteredData.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[#637381]">
                          Nenhum produto corresponde aos seus filtros.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {filteredData.length > 5 && (
                  <div className="py-2 text-center text-xs text-[#637381] bg-[#f9fafb] border-t border-[#dfe3e8]">
                    Mostrando 5 de {filteredData.length} linhas
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Action */}
            <div className="bg-white rounded-lg shadow-sm border border-[#dfe3e8] p-6">
              <h2 className="text-sm font-bold text-[#212b36] uppercase tracking-wider mb-4">
                Passo 3: Escolha como editar os produtos/variantes
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#212b36] mb-1">Escolha uma opção:</label>
                  <div className="relative w-full md:w-1/2">
                    <select
                      value={actionType}
                      onChange={(e) => setActionType(e.target.value as EditActionType)}
                      className="w-full appearance-none bg-white border border-[#c4cdd5] rounded-md py-2 pl-3 pr-10 text-sm focus:outline-none focus:border-[#5c6ac4]"
                    >
                      {availableActions.map((a) => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#637381]">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Dynamic Action Inputs */}
                <div className="w-full md:w-1/2 space-y-3 p-4 bg-[#f9fafb] rounded-md border border-[#dfe3e8]">
                  {(actionType === 'add_beginning' || actionType === 'add_end' || actionType === 'remove_text' || actionType === 'set_to') && !isPriceField && (
                    <input
                      type="text"
                      placeholder="Texto..."
                      value={actionParams.text || ''}
                      onChange={(e) => setActionParams({ ...actionParams, text: e.target.value })}
                      className="w-full bg-white border border-[#c4cdd5] rounded-md py-2 px-3 text-sm focus:outline-none focus:border-[#5c6ac4]"
                    />
                  )}
                  {actionType === 'find_replace' && (
                    <>
                      <input
                        type="text"
                        placeholder="Localizar texto..."
                        value={actionParams.find || ''}
                        onChange={(e) => setActionParams({ ...actionParams, find: e.target.value })}
                        className="w-full bg-white border border-[#c4cdd5] rounded-md py-2 px-3 text-sm focus:outline-none focus:border-[#5c6ac4]"
                      />
                      <input
                        type="text"
                        placeholder="Substituir por..."
                        value={actionParams.replace || ''}
                        onChange={(e) => setActionParams({ ...actionParams, replace: e.target.value })}
                        className="w-full bg-white border border-[#c4cdd5] rounded-md py-2 px-3 text-sm focus:outline-none focus:border-[#5c6ac4]"
                      />
                    </>
                  )}
                  {actionType === 'change_case' && (
                    <select
                      value={actionParams.case || 'uppercase'}
                      onChange={(e) => setActionParams({ ...actionParams, case: e.target.value })}
                      className="w-full bg-white border border-[#c4cdd5] rounded-md py-2 px-3 text-sm focus:outline-none focus:border-[#5c6ac4]"
                    >
                      <option value="uppercase">MAIÚSCULAS</option>
                      <option value="lowercase">minúsculas</option>
                    </select>
                  )}
                  {(actionType === 'increase_by_amount' || actionType === 'decrease_by_amount') && (
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#637381]">$</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={actionParams.amount || ''}
                        onChange={(e) => setActionParams({ ...actionParams, amount: e.target.value })}
                        className="w-full bg-white border border-[#c4cdd5] rounded-md py-2 pl-7 pr-3 text-sm focus:outline-none focus:border-[#5c6ac4]"
                      />
                    </div>
                  )}
                  {(actionType === 'increase_by_percent' || actionType === 'decrease_by_percent') && (
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="0"
                        value={actionParams.percent || ''}
                        onChange={(e) => setActionParams({ ...actionParams, percent: e.target.value })}
                        className="w-full bg-white border border-[#c4cdd5] rounded-md py-2 pl-3 pr-8 text-sm focus:outline-none focus:border-[#5c6ac4]"
                      />
                      <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#637381]">%</span>
                    </div>
                  )}
                  {actionType === 'set_to' && isPriceField && (
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#637381]">$</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={actionParams.text || ''}
                        onChange={(e) => setActionParams({ ...actionParams, text: e.target.value })}
                        className="w-full bg-white border border-[#c4cdd5] rounded-md py-2 pl-7 pr-3 text-sm focus:outline-none focus:border-[#5c6ac4]"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-[#dfe3e8] flex items-center gap-4">
                  <button
                    onClick={handleExecute}
                    disabled={!filteredData.length}
                    className="bg-[#5c6ac4] hover:bg-[#475399] disabled:bg-[#c4cdd5] disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-md font-medium transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Iniciar Edição em Massa
                  </button>
                  <span className="text-sm text-[#637381]">
                    Isso fará o download de um novo arquivo CSV com suas alterações.
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
