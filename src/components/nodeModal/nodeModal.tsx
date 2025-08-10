import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NodeTypes } from "@/models/nodeType.enum";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { nodeTypeModel } from "@/models/nodeTypeName.model";

interface InodeModal {
  node: {
    cpfCnpj?: string;
    date?: string;
    nodeType: NodeTypes;
    names: string[];
    degreeCentrality?: number;
    betweennessCentrality?: number;
    closenessCentrality?: number;
    transactions: any[];
  };
}

export default function NodeModal({ node }: InodeModal) {
  let cpfCnpj = "";
  let date = "";
  let nodeType = "";
  let names: any = [];
  let degreeCentrality = 0;
  let betweennessCentrality = 0;
  let closenessCentrality = 0;
  let transactions = [];

  if (node) {
    cpfCnpj = node.cpfCnpj || '';
    date =  node.date || '';
    nodeType = node.nodeType;
    names = node.names?.length ? node.names : [];
    degreeCentrality = node.degreeCentrality || 0;
    betweennessCentrality = node.betweennessCentrality || 0;
    closenessCentrality = node.closenessCentrality || 0;
    transactions = node.transactions;
  }

  const nodeTypeName = nodeType !== '' ? nodeTypeModel[nodeType] : '';
  const total = transactions.reduce((acc, transaction)=>{
    const valorTransacao = transaction['VALOR_TRANSACAO'];
    const fixedPrecisionValue = valorTransacao.replace(",",".");
    const numberValue = Number(fixedPrecisionValue) || 0;
    return acc+numberValue;
  }, 0)

  return (
    <DialogContent className="bg-zinc-900 text-zinc-50 border-zinc-600 min-w-2/3">
      <DialogHeader>
        <DialogTitle>Nó {nodeTypeName}</DialogTitle>
      </DialogHeader>
      <header className="flex flex-col gap-1">
        <h3 className="text-md font-bold mb-1">Informações</h3>
        { nodeType !== NodeTypes.DIARY_TRANSACTIONS && 
        (
          <>
          <p>Cpf/Cnpj: {cpfCnpj}</p>
          <p>
            Nomes do {nodeTypeName}: {names.join(", ")}
          </p>
          </>
        )}

        { nodeType === NodeTypes.DIARY_TRANSACTIONS && 
        (
          <p>Transação do dia: {date}</p>
        )}
        <div>
          <p>Degree Centrality: {degreeCentrality?.toFixed(4)}</p>
          <p>Betweness Centrality: {betweennessCentrality?.toFixed(4)}</p>
          <p>Closeness Centrality: {closenessCentrality?.toFixed(4)}</p>
        </div>
      </header>
      <div>
        <h3 className="text-md font-bold mb-3">Transações</h3>
        <div className="h-64 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-zinc-50">Cpf/Cnpj Titular</TableHead>
                <TableHead className="text-zinc-50">Cpf/Cnpj OD</TableHead>
                <TableHead className="text-zinc-50">Nome OD</TableHead>
                <TableHead className="text-zinc-50">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction, index) => (
                <TableRow key={index}>
                  <TableCell>{transaction["CPF_CNPJ_TITULAR"]}</TableCell>
                  <TableCell>{transaction["CPF_CNPJ_OD"]}</TableCell>
                  <TableCell>{transaction["NOME_PESSOA_OD"]}</TableCell>
                  <TableCell>{transaction["VALOR_TRANSACAO"]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>Total</TableCell>
                <TableCell>{total}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </div>
    </DialogContent>
  );
}
