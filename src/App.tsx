import { useEffect, useState } from "react";
import { supabase } from "@/supabase";
import SummaryCard from "@/components/dashboard/SummaryCard";
import TransactionTable from "@/components/dashboard/TransactionTable";
import AddTransactionModal from "@/components/dashboard/AddTransactionModal";
import Charts from "@/components/dashboard/Charts";
import SubscriptionStatus from "@/components/dashboard/SubscriptionStatus";

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [openModal, setOpenModal] = useState(false);

  async function loadData() {
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });

    setTransactions(data || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  const total = transactions.reduce((acc, t) => acc + t.amount, 0);
  const entradas = transactions
    .filter((t) => t.amount > 0)
    .reduce((acc, t) => acc + t.amount, 0);
  const saidas = transactions
    .filter((t) => t.amount < 0)
    .reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="p-6 bg-[#0a0a0f] min-h-screen text-white">
      <SubscriptionStatus />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 mt-4">
        <SummaryCard title="Saldo Total" value={total} />
        <SummaryCard title="Entradas" value={entradas} />
        <SummaryCard title="Saídas" value={saidas} />
      </div>

      <Charts transactions={transactions} />

      <div className="flex justify-between mt-8">
        <h2 className="text-xl font-semibold">Histórico</h2>
        <button
          onClick={() => setOpenModal(true)}
          className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-xl"
        >
          + Nova Transação
        </button>
      </div>

      <TransactionTable transactions={transactions} />

      <AddTransactionModal
        open={openModal}
        onClose={() => {
          setOpenModal(false);
          loadData();
        }}
      />
    </div>
  );
}
