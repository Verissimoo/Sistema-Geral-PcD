import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';

// Tratamento de erro centralizado: toda falha de leitura/escrita exibe um
// toast — as páginas não precisam de try/catch repetitivo. Handlers locais
// (onError no useMutation/mutateAsync) continuam funcionando por cima.
function notifyError(error, fallbackTitle) {
	toast({
		title: fallbackTitle,
		description: error?.message || String(error),
		variant: 'destructive',
	});
}

export const queryClientInstance = new QueryClient({
	queryCache: new QueryCache({
		onError: (error) => notifyError(error, 'Erro ao carregar dados'),
	}),
	mutationCache: new MutationCache({
		onError: (error) => notifyError(error, 'Erro ao salvar'),
	}),
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
		},
	},
});
