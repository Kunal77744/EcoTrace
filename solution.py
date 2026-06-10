import sys

def solve():
    # Read all inputs from standard input
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    
    n = int(input_data[0])
    strs = input_data[1:1+n]
    
    # Union-Find (DSU) implementation
    parent = list(range(n))
    count = n
    
    def find(i):
        path = []
        while parent[i] != i:
            path.append(i)
            i = parent[i]
        for node in path:
            parent[node] = i
        return i
        
    def union(i, j):
        nonlocal count
        root_i = find(i)
        root_j = find(j)
        if root_i != root_j:
            parent[root_i] = root_j
            count -= 1
            
    def are_similar(s1, s2):
        if len(s1) != len(s2):
            return False
        diff = 0
        for c1, c2 in zip(s1, s2):
            if c1 != c2:
                diff += 1
                if diff > 4:
                    return False
        return True

    # Compare all pairs and union if similar
    for i in range(n):
        for j in range(i + 1, n):
            if are_similar(strs[i], strs[j]):
                union(i, j)
                
    print(count)

if __name__ == '__main__':
    solve()
