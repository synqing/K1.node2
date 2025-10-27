---
author: Claude Agent (Technical Architect)
date: 2025-10-27
status: published
intent: Layer 2 specification for C++ static analysis, AST parsing, and performance profiling
---

# Layer 2: C++ Code Analysis & Profiling - Technical Specification

## Overview

Layer 2 builds on Layer 1's graph foundation to analyze and profile actual C++ code:
1. Static analysis via AST-based code examination
2. Template instantiation tracking
3. Memory access pattern detection
4. Performance profiling instrumentation

---

## 1. PATH RESOLUTION & NORMALIZATION

### 1.1 Cross-Platform Path Handling

```cpp
class PathResolver {
  using PathCache = std::unordered_map<std::string, std::filesystem::path>;

  // Unified path handling for Windows/Unix
  struct ResolvedPath {
    std::filesystem::path absolute;
    std::filesystem::path relative;
    bool exists;
    bool is_directory;
    std::string canonical_form;
  };

  ResolvedPath resolve(
    const std::string& path,
    const std::filesystem::path& base_dir = std::filesystem::current_path()
  ) {
    // Normalize separators (/ vs \)
    auto normalized = normalize_separators(path);

    // Resolve relative to absolute
    auto absolute = resolve_relative(normalized, base_dir);

    // Canonicalize (resolve .. and .)
    auto canonical = std::filesystem::weakly_canonical(absolute);

    return {
      .absolute = canonical,
      .relative = std::filesystem::relative(canonical, base_dir),
      .exists = std::filesystem::exists(canonical),
      .is_directory = std::filesystem::is_directory(canonical),
      .canonical_form = canonical.string()
    };
  }

private:
  std::string normalize_separators(const std::string& path) {
    std::string result = path;
    #ifdef _WIN32
    std::replace(result.begin(), result.end(), '/', '\\');
    #else
    std::replace(result.begin(), result.end(), '\\', '/');
    #endif
    return result;
  }

  std::filesystem::path resolve_relative(
    const std::string& path,
    const std::filesystem::path& base
  ) {
    if (std::filesystem::path(path).is_absolute()) {
      return path;
    }
    return base / path;
  }
};
```

### 1.2 Dependency Path Caching

```cpp
class DependencyPathCache {
  struct CacheEntry {
    std::vector<std::filesystem::path> include_paths;
    std::chrono::system_clock::time_point cached_at;
    std::filesystem::file_time_type source_mtime;
  };

  std::unordered_map<std::string, CacheEntry> cache;
  std::mutex cache_lock;

  std::vector<std::filesystem::path> get_dependency_paths(
    const std::string& source_file
  ) {
    {
      std::lock_guard<std::mutex> lock(cache_lock);
      auto it = cache.find(source_file);

      if (it != cache.end()) {
        // Check if source file has been modified
        auto current_mtime = std::filesystem::last_write_time(source_file);
        if (current_mtime == it->second.source_mtime) {
          return it->second.include_paths;  // Cache hit
        }
      }
    }

    // Cache miss or stale - recompute
    auto paths = analyze_dependencies(source_file);

    {
      std::lock_guard<std::mutex> lock(cache_lock);
      cache[source_file] = {
        .include_paths = paths,
        .cached_at = std::chrono::system_clock::now(),
        .source_mtime = std::filesystem::last_write_time(source_file)
      };
    }

    return paths;
  }

private:
  std::vector<std::filesystem::path> analyze_dependencies(
    const std::string& source_file
  );
};
```

---

## 2. C++ AST-BASED STATIC ANALYZER

### 2.1 Clang Integration Framework

**Recommended**: Use libclang (stable C API) + Clang ASTMatchers

```cpp
class ClangAnalyzer {
  struct AnalysisContext {
    clang::ASTContext* ast_context;
    clang::SourceManager* source_manager;
    clang::Rewriter rewriter;
  };

  // Use ASTMatchers for pattern matching
  class AnalysisVisitor : public clang::ast_matchers::MatchFinder::MatchCallback {
    void onEndOfTranslationUnit() override {
      // Finalize analysis
    }

    void run(const clang::ast_matchers::MatchFinder::MatchResult& result) override {
      // Process matched nodes
      if (const auto* func = result.Nodes.getNodeAs<clang::FunctionDecl>("func")) {
        analyze_function(*func, result.Context);
      }
    }

  private:
    void analyze_function(
      const clang::FunctionDecl& func,
      clang::ASTContext* context
    ) {
      // Extract metrics: cyclomatic complexity, parameter count, etc.
    }
  };

public:
  std::vector<AnalysisResult> analyze_file(const std::string& source_file) {
    clang::tooling::ClangTool tool(
      compilation_database, { source_file }
    );

    AnalysisVisitor visitor;
    clang::ast_matchers::MatchFinder finder;

    // Register patterns to match
    finder.addMatcher(
      clang::ast_matchers::functionDecl(
        clang::ast_matchers::hasName(".*")
      ).bind("func"),
      &visitor
    );

    tool.run(clang::tooling::newFrontendActionFactory(&finder).get());

    return visitor.get_results();
  }
};
```

### 2.2 Template Instantiation Tracking

**Challenge**: C++ templates create implicit code not visible in source

```cpp
class TemplateInstantiationTracker {
  struct TemplateInstance {
    std::string template_name;
    std::vector<std::string> type_parameters;
    std::string instantiated_location;  // file:line
    size_t code_size_bytes;
  };

  class TemplateVisitor : public clang::SemaConsumer {
    void CompleteTentativeDefinition(clang::VarDecl* D) override {}

    void HandleTagDeclDefinition(clang::TagDecl* D) override {
      if (auto* spec = llvm::dyn_cast<clang::ClassTemplateSpecializationDecl>(D)) {
        record_instantiation(*spec);
      }
    }

  private:
    void record_instantiation(
      const clang::ClassTemplateSpecializationDecl& spec
    ) {
      std::string template_name = spec.getNameAsString();
      auto args = spec.getTemplateArgs();

      std::vector<std::string> type_params;
      for (unsigned i = 0; i < args.size(); ++i) {
        type_params.push_back(args[i].getAsType().getAsString());
      }

      // Record instantiation with source location
      instantiations.push_back({
        .template_name = template_name,
        .type_parameters = type_params,
        .instantiated_location = get_source_location(spec),
        .code_size_bytes = estimate_code_size(spec)
      });
    }

    std::vector<TemplateInstance> instantiations;
  };
};
```

### 2.3 Memory Access Pattern Detection

**Goal**: Identify cache inefficiencies, memory thrashing

```cpp
class MemoryAccessAnalyzer {
  struct AccessPattern {
    std::string variable_name;
    std::string access_type;  // read, write, read_write
    std::vector<std::string> access_locations;  // file:line entries
    bool is_sequential;
    bool is_strided;
    float spatial_locality_score;  // 0-1
  };

  std::vector<AccessPattern> analyze_memory_access(
    const clang::FunctionDecl& func
  ) {
    std::vector<AccessPattern> patterns;
    AccessCollector collector;

    // Walk AST to find array/pointer accesses
    collector.TraverseDecl(const_cast<clang::FunctionDecl*>(&func));

    // Analyze access sequences
    for (const auto& var_accesses : collector.get_variable_accesses()) {
      patterns.push_back(analyze_access_sequence(var_accesses));
    }

    return patterns;
  }

private:
  AccessPattern analyze_access_sequence(
    const std::vector<AccessInfo>& accesses
  ) {
    // Detect sequential vs random access
    bool sequential = is_sequential_access(accesses);
    bool strided = detect_strided_access(accesses);

    // Compute spatial locality (how close accesses are in memory)
    float locality = compute_spatial_locality(accesses);

    return {
      .variable_name = accesses[0].var_name,
      .access_type = "read_write",
      .access_locations = get_locations(accesses),
      .is_sequential = sequential,
      .is_strided = strided,
      .spatial_locality_score = locality
    };
  }
};
```

---

## 3. AST TRANSFORMATION & DIFFING

### 3.1 AST Transformation Pipeline

```cpp
class ASTTransformationPipeline {
  struct Transformation {
    std::string name;
    std::function<clang::Stmt*(clang::Stmt*, clang::ASTContext*)> transform;
  };

  // Example: Loop unrolling transformation
  clang::Stmt* unroll_loop(clang::ForStmt* loop, clang::ASTContext* ctx) {
    auto unroll_factor = 4;

    // Analyze loop to ensure unrolling is safe
    if (!is_unrollable(*loop)) {
      return loop;  // Leave unchanged
    }

    // Generate unrolled code
    clang::Stmt* unrolled = generate_unrolled_body(*loop, unroll_factor, ctx);

    return unrolled;
  }

  std::vector<Transformation> transformations = {
    {
      .name = "loop_unrolling",
      .transform = [this](clang::Stmt* s, clang::ASTContext* ctx) {
        if (auto* loop = llvm::dyn_cast<clang::ForStmt>(s)) {
          return unroll_loop(loop, ctx);
        }
        return s;
      }
    },
    // ... more transformations
  };

  clang::Stmt* apply_transformations(clang::Stmt* ast) {
    clang::Stmt* current = ast;

    for (const auto& transform : transformations) {
      current = transform.transform(current, ast_context);
    }

    return current;
  }
};
```

### 3.2 Semantic Preservation Checks

```cpp
class SemanticPreservationValidator {
  bool preserves_semantics(
    const clang::Stmt* original,
    const clang::Stmt* transformed
  ) {
    // Check 1: Same return type
    if (!same_return_type(original, transformed)) {
      return false;
    }

    // Check 2: Same side effects
    if (has_different_side_effects(original, transformed)) {
      return false;
    }

    // Check 3: Same exception behavior
    if (different_exception_behavior(original, transformed)) {
      return false;
    }

    // Check 4: Same observable behavior (symbolic execution)
    return symbolic_execution_equivalent(original, transformed);
  }

private:
  bool symbolic_execution_equivalent(
    const clang::Stmt* original,
    const clang::Stmt* transformed
  ) {
    // Use symbolic execution engine to verify equivalence
    auto sym_original = symbolic_execute(original);
    auto sym_transformed = symbolic_execute(transformed);

    return sym_original == sym_transformed;
  }
};
```

### 3.3 AST Diffing Tools

```cpp
class ASTDiffer {
  struct ASTDiff {
    std::string change_type;  // added, removed, modified
    std::string location;     // file:line
    std::string description;
  };

  std::vector<ASTDiff> compute_diff(
    const clang::Stmt* original,
    const clang::Stmt* transformed
  ) {
    std::vector<ASTDiff> diffs;

    // Structural diff
    diffs = structural_diff(original, transformed);

    // Semantic diff
    auto semantic = semantic_diff(original, transformed);
    diffs.insert(diffs.end(), semantic.begin(), semantic.end());

    return diffs;
  }

private:
  std::vector<ASTDiff> structural_diff(
    const clang::Stmt* original,
    const clang::Stmt* transformed
  ) {
    // Tree-based diff algorithm (like unified diff for code)
    return tree_edit_distance(original, transformed);
  }

  std::vector<ASTDiff> semantic_diff(
    const clang::Stmt* original,
    const clang::Stmt* transformed
  ) {
    // Compare observable behavior, not just syntax
    return {};
  }
};
```

---

## 4. PERFORMANCE PROFILING INSTRUMENTATION

### 4.1 Instrumentation Framework

```cpp
class InstrumentationFramework {
  struct Instrument {
    std::string name;
    std::string metric;  // cycles, instructions, cache_misses, etc.
    std::function<void(clang::FunctionDecl*)> inject;
  };

  // Inject timing code
  void inject_timing(clang::FunctionDecl* func) {
    // Insert at function entry:
    // auto start = std::chrono::high_resolution_clock::now();

    // Insert at function exit:
    // auto end = std::chrono::high_resolution_clock::now();
    // __profiler_record(func_name, (end - start).count());
  }

  // Inject hardware counter sampling
  void inject_perf_sampling(clang::FunctionDecl* func) {
    // Insert perf event register/read instructions
    // Uses PAPI or perf_event_open
  }

  std::vector<Instrument> instruments = {
    {
      .name = "timing",
      .metric = "nanoseconds",
      .inject = [this](clang::FunctionDecl* f) { inject_timing(f); }
    },
    {
      .name = "perf_counters",
      .metric = "hardware_events",
      .inject = [this](clang::FunctionDecl* f) { inject_perf_sampling(f); }
    }
  };

  void instrument_function(clang::FunctionDecl* func) {
    for (const auto& instr : instruments) {
      instr.inject(func);
    }
  }
};
```

### 4.2 Statistical Sampling Profiler

**Approach**: Periodic sampling (10 kHz) to avoid overhead

```cpp
class SamplingProfiler {
  struct SamplingData {
    std::string function_name;
    uint64_t sample_count;
    double percentage_of_total;
    std::vector<std::string> call_stack;
  };

  // Signature: runs at ~10 kHz (100µs intervals)
  static void sampling_handler(int signal) {
    // Get current stack trace
    ucontext_t* ctx = nullptr;  // From signal handler
    void* stack[64];
    int frames = backtrace(stack, 64);

    // Record in per-thread buffer
    thread_local_buffer.push_back({
      .timestamp = rdtsc(),  // CPU cycle counter
      .frames = frames,
      .stack = stack
    });
  }

  std::vector<SamplingData> aggregate_samples() {
    std::unordered_map<std::string, uint64_t> function_counts;
    uint64_t total_samples = 0;

    for (const auto& sample : thread_local_buffer) {
      for (int i = 0; i < sample.frames; ++i) {
        auto func_name = resolve_symbol(sample.stack[i]);
        function_counts[func_name]++;
        total_samples++;
      }
    }

    std::vector<SamplingData> results;
    for (const auto& [func, count] : function_counts) {
      results.push_back({
        .function_name = func,
        .sample_count = count,
        .percentage_of_total = 100.0 * count / total_samples,
        .call_stack = {}
      });
    }

    return results;
  }
};
```

### 4.3 Flame Graph Integration

```cpp
class FlameGraphGenerator {
  std::string generate_flamegraph_format(
    const std::vector<SamplingData>& samples
  ) {
    std::stringstream ss;

    for (const auto& sample : samples) {
      // Format: func1;func2;func3 count
      std::string stack_str = join(sample.call_stack, ";");
      ss << stack_str << " " << sample.sample_count << "\n";
    }

    return ss.str();
  }

  void export_flamegraph(
    const std::string& output_file,
    const std::vector<SamplingData>& samples
  ) {
    // Save in flamegraph format
    std::ofstream file(output_file);
    file << generate_flamegraph_format(samples);

    // Can be visualized with: flamegraph.pl script or online viewers
  }
};
```

---

## 5. SUCCESS CRITERIA FOR LAYER 2

✅ **Path Resolution**
- Cross-platform path handling (Windows/Unix) tested
- Dependency path caching with correct invalidation
- 100% of relative→absolute conversions correct

✅ **AST Analysis**
- Template instantiation tracking captures all specializations
- Memory access pattern detection identifies cache issues
- Static analyzer integrates with Clang libclang stably

✅ **Semantic Preservation**
- AST transformations verified to preserve observable behavior
- Diffing tools show all structural and semantic changes
- <1% false negatives on equivalence checking

✅ **Performance Profiling**
- Sampling overhead <1% (10 kHz sampling rate)
- Timing precision ±100 nanoseconds
- Flame graphs capture 95%+ of call stacks

---

## 6. IMPLEMENTATION ROADMAP

**Week 1-2**: Path resolution + caching
**Week 3-4**: Clang integration + AST analysis
**Week 5-6**: Template tracking + memory patterns
**Week 7-8**: Performance instrumentation + flame graphs

---

**Status**: Published ✅
**Next Layer**: Layer 3 (Execution Engine & Measurement)
