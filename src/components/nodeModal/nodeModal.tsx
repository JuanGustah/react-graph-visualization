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

interface InodeModal {
  node: {
    cpfCnpj: string;
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
  let nodeType = "";
  let names: any = [];
  let degreeCentrality = 0;
  let betweennessCentrality = 0;
  let closenessCentrality = 0;
  let transactions = [];

  if (node) {
    cpfCnpj = node.cpfCnpj;
    nodeType = node.nodeType;
    names = node.names;
    degreeCentrality = node.degreeCentrality || 0;
    betweennessCentrality = node.betweennessCentrality || 0;
    closenessCentrality = node.closenessCentrality || 0;
    transactions = node.transactions;
  }

  const nodeTypeName = nodeType === NodeTypes.ROOT ? "Titular" : "OD";

  return (
    <DialogContent className="bg-zinc-900 text-zinc-50 border-zinc-600">
      <DialogHeader>
        <DialogTitle>Nó {nodeTypeName}</DialogTitle>
      </DialogHeader>
      <header className="flex flex-col gap-1">
        <h3 className="text-md font-bold mb-1">Informações</h3>
        <p>Cpf/Cnpj: {cpfCnpj}</p>
        <p>
          Nomes do {nodeTypeName}: {names.join(", ")}
        </p>
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
                <TableHead className="text-zinc-50">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction, index) => (
                <TableRow key={index}>
                  <TableCell>{transaction["CPF_CNPJ_TITULAR"]}</TableCell>
                  <TableCell>{transaction["CPF_CNPJ_OD"]}</TableCell>
                  <TableCell>{transaction["VALOR_TRANSACAO"]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell>$2,500.00</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </div>
    </DialogContent>
  );
}
