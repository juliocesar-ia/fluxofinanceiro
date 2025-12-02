import { useState } from "react";
import { supabase } from "../../supabase";

export default function AddTransactionModal({ open, onClose }) {
  if (!open) return null;

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");

  async function addTransaction() {
    await supabase.from("transactions").insert({
      description,
      amount: Number(amount),
      category,
    });

    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
      <div className="bg-[#15151b] p-6 rounded-2xl w-80">
        <h2 className="text-lg font-semibold">Nova Transação</h2>

        <input
          className="mt-3 w-full p-2 rounded bg-[#1e1e28]"
          placeholder="Descrição"
          onChange={(e) => setDescription(e.target.value)}
        />

        <input
          className="mt-3 w-full p-2 rounded bg-[#1e1e28]"
          placeholder="Valor (use negativo para saída)"
          onChange={(e) => setAmount(e.target.value)}
        />

        <input
          className="mt-3 w-full p-2 rounded bg-[#1e1e28]"
          placeholder="Categoria"
          onChange={(e) => setCategory(e.target.value)}
        />

        <button
          onClick={addTransaction}
          className="mt-4 bg-purple-600 w-full py-2 rounded-xl"
        >
          Salvar
        </button>

        <button onClick={onClose} className="mt-2 text-gray-400 text-sm">
          Cancelar
        </button>
      </div>
    </div>
  );
}
