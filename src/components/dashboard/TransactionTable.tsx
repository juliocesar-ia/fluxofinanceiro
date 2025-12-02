export default function TransactionTable({ transactions }) {
  return (
    <div className="mt-4 bg-[#15151b] rounded-2xl p-4 border border-[#222]">
      <table className="w-full">
        <thead>
          <tr className="text-gray-500 text-left">
            <th>Descrição</th>
            <th>Categoria</th>
            <th>Valor</th>
            <th>Data</th>
          </tr>
        </thead>

        <tbody>
          {transactions.map((t) => (
            <tr key={t.id} className="border-t border-[#222] hover:bg-[#1e1e28]">
              <td className="py-2">{t.description}</td>
              <td>{t.category}</td>
              <td className={t.amount > 0 ? "text-green-400" : "text-red-400"}>
                R$ {t.amount.toFixed(2).replace(".", ",")}
              </td>
              <td>{new Date(t.created_at).toLocaleDateString("pt-BR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
