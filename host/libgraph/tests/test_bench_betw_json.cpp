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

    // Second scenario: layers range with domain_avg normalization
    const std::string metricsPath2 = "./betw2.metrics.json";
    std::string cmd2 = std::string("./k1_graph_bench --layers 10 --width 6 --betweenness-samples 10 ")
                     + "--betweenness-domain layers:2-4 --betweenness-top-k 6 "
                     + "--betweenness-normalize-scheme domain_avg --betweenness-seed 11 "
                     + "--metrics " + metricsPath2 + " --out ./bench2.topo.json";
    rc = std::system(cmd2.c_str());
    CHECK(rc == 0);
    std::ifstream ifs2(metricsPath2);
    CHECK(ifs2.good());
    std::ostringstream oss2; oss2 << ifs2.rdbuf();
    std::string body2 = oss2.str();
    CHECK(body2.find("\"betweenness_sample_count\": 10") != std::string::npos);
    CHECK(body2.find("\"betweenness_domain\": \"layers:2-4\"") != std::string::npos);
    CHECK(body2.find("\"betweenness_top_k\": 6") != std::string::npos);
    CHECK(body2.find("\"betweenness_normalized\": true") != std::string::npos);
    CHECK(body2.find("\"betweenness_normalization_scheme\": \"domain_avg\"") != std::string::npos);
    CHECK(body2.find("\"betweenness_sampling\": \"random\"") != std::string::npos);
    CHECK(body2.find("\"betweenness_seed\": 11") != std::string::npos);
    CHECK(body2.find("\"betweenness_ms\": ") != std::string::npos);
    CHECK(body2.find("\"betweenness_top_nodes\": [") != std::string::npos);

    // Third scenario: step range with zscore normalization
    const std::string metricsPath3 = "./betw3.metrics.json";
    std::string cmd3 = std::string("./k1_graph_bench --layers 9 --width 7 --betweenness-samples 9 ")
                     + "--betweenness-domain layers:1-7:step:2 --betweenness-top-k 7 "
                     + "--betweenness-normalize-scheme zscore --betweenness-seed 21 "
                     + "--metrics " + metricsPath3 + " --out ./bench3.topo.json";
    rc = std::system(cmd3.c_str());
    CHECK(rc == 0);
    std::ifstream ifs3(metricsPath3);
    CHECK(ifs3.good());
    std::ostringstream oss3; oss3 << ifs3.rdbuf();
    std::string body3 = oss3.str();
    CHECK(body3.find("\"betweenness_domain\": \"layers:1-7:step:2\"") != std::string::npos);
    CHECK(body3.find("\"betweenness_normalization_scheme\": \"zscore\"") != std::string::npos);

    // Fourth scenario: quantile range with domain_minmax normalization
    const std::string metricsPath4 = "./betw4.metrics.json";
    std::string cmd4 = std::string("./k1_graph_bench --layers 12 --width 5 --betweenness-samples 12 ")
                     + "--betweenness-domain quantile:0.25-0.75 --betweenness-top-k 6 "
                     + "--betweenness-normalize-scheme domain_minmax --betweenness-seed 31 "
                     + "--metrics " + metricsPath4 + " --out ./bench4.topo.json";
    rc = std::system(cmd4.c_str());
    CHECK(rc == 0);
    std::ifstream ifs4(metricsPath4);
    CHECK(ifs4.good());
    std::ostringstream oss4; oss4 << ifs4.rdbuf();
    std::string body4 = oss4.str();
    CHECK(body4.find("\"betweenness_domain\": \"quantile:0.25-0.75\"") != std::string::npos);
    CHECK(body4.find("\"betweenness_normalization_scheme\": \"domain_minmax\"") != std::string::npos);

    // Fifth scenario: quantile with stride and minmax_layer normalization
    const std::string metricsPath5 = "./betw5.metrics.json";
    std::string cmd5 = std::string("./k1_graph_bench --layers 9 --width 7 --betweenness-samples 9 ")
                     + "--betweenness-domain quantile:0.25-0.75:step:2 --betweenness-top-k 7 "
                     + "--betweenness-normalize-scheme minmax_layer --betweenness-seed 41 "
                     + "--metrics " + metricsPath5 + " --out ./bench5.topo.json";
    rc = std::system(cmd5.c_str());
    CHECK(rc == 0);
    std::ifstream ifs5(metricsPath5);
    CHECK(ifs5.good());
    std::ostringstream oss5; oss5 << ifs5.rdbuf();
    std::string body5 = oss5.str();
    CHECK(body5.find("\"betweenness_domain\": \"quantile:0.25-0.75:step:2\"") != std::string::npos);
    CHECK(body5.find("\"betweenness_normalization_scheme\": \"minmax_layer\"") != std::string::npos);

    // Sixth scenario: layer_quantile by outdeg with robust_zscore normalization
    const std::string metricsPath6 = "./betw6.metrics.json";
    std::string cmd6 = std::string("./k1_graph_bench --layers 10 --width 6 --betweenness-samples 10 ")
                     + "--betweenness-domain layer_quantile:outdeg:0.0-0.0 --betweenness-top-k 6 "
                     + "--betweenness-normalize-scheme robust_zscore --betweenness-seed 51 "
                     + "--metrics " + metricsPath6 + " --out ./bench6.topo.json";
    rc = std::system(cmd6.c_str());
    CHECK(rc == 0);
    std::ifstream ifs6(metricsPath6);
    CHECK(ifs6.good());
    std::ostringstream oss6; oss6 << ifs6.rdbuf();
    std::string body6 = oss6.str();
    CHECK(body6.find("\"betweenness_domain\": \"layer_quantile:outdeg:0.0-0.0\"") != std::string::npos);
    CHECK(body6.find("\"betweenness_normalization_scheme\": \"robust_zscore\"") != std::string::npos);

    // Seventh scenario: layer_quantile with indeg_median metric
    const std::string metricsPath7 = "./betw7.metrics.json";
    std::string cmd7 = std::string("./k1_graph_bench --layers 10 --width 6 --betweenness-samples 10 ")
                     + "--betweenness-domain layer_quantile:indeg_median:0.0-0.0 --betweenness-top-k 6 "
                     + "--betweenness-normalize-scheme zscore --betweenness-seed 61 "
                     + "--metrics " + metricsPath7 + " --out ./bench7.topo.json";
    rc = std::system(cmd7.c_str());
    CHECK(rc == 0);
    std::ifstream ifs7(metricsPath7);
    CHECK(ifs7.good());
    std::ostringstream oss7; oss7 << ifs7.rdbuf();
    std::string body7 = oss7.str();
    CHECK(body7.find("\"betweenness_domain\": \"layer_quantile:indeg_median:0.0-0.0\"") != std::string::npos);
    CHECK(body7.find("\"betweenness_normalization_scheme\": \"zscore\"") != std::string::npos);

    // Eighth scenario: layer_rank top-2 by outdeg
    const std::string metricsPath8 = "./betw8.metrics.json";
    std::string cmd8 = std::string("./k1_graph_bench --layers 10 --width 6 --betweenness-samples 10 ")
                     + "--betweenness-domain layer_rank:outdeg:top:2 --betweenness-top-k 6 "
                     + "--betweenness-normalize-scheme domain_minmax --betweenness-seed 71 "
                     + "--metrics " + metricsPath8 + " --out ./bench8.topo.json";
    rc = std::system(cmd8.c_str());
    CHECK(rc == 0);
    std::ifstream ifs8(metricsPath8);
    CHECK(ifs8.good());
    std::ostringstream oss8; oss8 << ifs8.rdbuf();
    std::string body8 = oss8.str();
    CHECK(body8.find("\"betweenness_domain\": \"layer_rank:outdeg:top:2\"") != std::string::npos);
    CHECK(body8.find("\"betweenness_normalization_scheme\": \"domain_minmax\"") != std::string::npos);

    if (g_failures) std::cerr << "FAILURES: " << g_failures << "\n";
    else std::cout << "Bench betweenness JSON test passed.\n";
    return g_failures ? 1 : 0;
}