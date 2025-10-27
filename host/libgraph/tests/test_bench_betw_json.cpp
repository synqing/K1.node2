#include <cstdlib>
#include <fstream>
#include <sstream>
#include <string>
#include <iostream>

static int g_failures = 0;
#define CHECK(c) do{ if(!(c)){ std::cerr<<"CHECK failed: " #c " at " << __FILE__ << ":" << __LINE__ << "\n"; ++g_failures; } }while(0)

int main(){
    const std::string metricsPath = "./betw.metrics.json";
    std::string cmd = std::string("./k1_graph_bench --layers 8 --width 8 --betweenness-samples 8 ")
                    + "--betweenness-domain layer0 --betweenness-top-k 5 --betweenness-normalize "
                    + "--betweenness-seed 7 --metrics " + metricsPath + " --out ./bench.topo.json";
    int rc = std::system(cmd.c_str());
    CHECK(rc == 0);
    std::ifstream ifs(metricsPath);
    CHECK(ifs.good());
    std::ostringstream oss; oss << ifs.rdbuf();
    std::string body = oss.str();
    CHECK(body.find("\"betweenness_sample_count\": 8") != std::string::npos);
    CHECK(body.find("\"betweenness_domain\": \"layer0\"") != std::string::npos);
    CHECK(body.find("\"betweenness_top_k\": 5") != std::string::npos);
    CHECK(body.find("\"betweenness_normalized\": true") != std::string::npos);
    CHECK(body.find("\"betweenness_sampling\": \"random\"") != std::string::npos);
    CHECK(body.find("\"betweenness_seed\": 7") != std::string::npos);
    CHECK(body.find("\"betweenness_ms\": ") != std::string::npos);
    // Ensure array of top nodes exists
    CHECK(body.find("\"betweenness_top_nodes\": [") != std::string::npos);

    if (g_failures) std::cerr << "FAILURES: " << g_failures << "\n";
    else std::cout << "Bench betweenness JSON test passed.\n";
    return g_failures ? 1 : 0;
}