import importlib

packages = [
    'langchain.retrievers', 
    'langchain.retrievers.ensemble', 
    'langchain_community.retrievers', 
    'langchain_community.retrievers.ensemble', 
    'langchain_core.retrievers',
    'langchain_core.retrievers.ensemble',
    'langchain.chains',
    'langchain_core.documents'
]

found = False
for p in packages:
    try:
        mod = importlib.import_module(p)
        if hasattr(mod, 'EnsembleRetriever'):
            print(f'Found EnsembleRetriever in {p}')
            found = True
        if hasattr(mod, 'BM25Retriever'):
            print(f'Found BM25Retriever in {p}')
    except ImportError:
        pass

if not found:
    print('EnsembleRetriever not found anywhere!')
