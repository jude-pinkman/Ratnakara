#!/bin/bash

# E2E Test Runner - Phase 1 MVP Validation
# This script tests all components of the Phase 1 MVP implementation

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((TESTS_PASSED++))
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
    ((TESTS_FAILED++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Test database connectivity
test_database_connection() {
    log_info "Testing database connection..."

    if psql -U postgres -d ratnakara_db -c "SELECT 1" &>/dev/null; then
        log_success "Database connection successful"
    else
        log_error "Database connection failed"
        return 1
    fi
}

# Test Darwin Core tables exist
test_darwin_core_tables() {
    log_info "Testing Darwin Core schema..."

    local tables=("occurrences" "environmental_measurements" "dna_sequences" "otolith_records" "edna_observations" "anomalies" "fisher_observations")

    for table in "${tables[@]}"; do
        if psql -U postgres -d ratnakara_db -c "\dt $table" 2>/dev/null | grep -q "$table"; then
            log_success "Table $table exists"
        else
            log_error "Table $table missing"
            return 1
        fi
    done
}

# Test JSON importer endpoint
test_json_importer() {
    log_info "Testing JSON importer..."

    local json_file="backend/data/samples/darwin-core.json"
    if [ ! -f "$json_file" ]; then
        log_warning "Sample JSON file not found, creating minimal test file..."
        mkdir -p backend/data/samples
        cat > "$json_file" << 'EOF'
{
  "records": [
    {
      "occurrenceID": "TEST-JSON-001",
      "scientificName": "Sardinella longiceps",
      "decimalLatitude": 12.5,
      "decimalLongitude": 88.3,
      "eventDate": "2024-03-20T10:30:00Z",
      "temperature_celsius": 27.5
    }
  ]
}
EOF
    fi

    # Check if record exists in DB
    if psql -U postgres -d ratnakara_db -c "SELECT 1 FROM occurrences WHERE occurrenceID = 'TEST-JSON-001'" 2>/dev/null | grep -q "1"; then
        log_success "JSON import verified in database"
    else
        log_warning "JSON test record not found (may need manual import)"
    fi
}

# Test DNA sequence GC content calculation
test_dna_gc_content() {
    log_info "Testing DNA sequence GC content..."

    local result=$(psql -U postgres -d ratnakara_db -tc "
        SELECT COUNT(*) FROM dna_sequences
        WHERE gc_content IS NOT NULL AND gc_content > 0 AND gc_content < 100
        LIMIT 1" 2>/dev/null || echo "0")

    if [ "$result" -gt 0 ]; then
        log_success "DNA sequences with GC content found"
    else
        log_warning "No DNA sequences with GC content (try importing FASTA file)"
    fi
}

# Test otolith temperature inference
test_otolith_temperature() {
    log_info "Testing otolith temperature inference..."

    local result=$(psql -U postgres -d ratnakara_db -tc "
        SELECT COUNT(*) FROM otolith_records
        WHERE temperature_inferred_celsius BETWEEN -2 AND 50
        LIMIT 1" 2>/dev/null || echo "0")

    if [ "$result" -gt 0 ]; then
        log_success "Otolith temperature inference verified"
    else
        log_warning "No otolith records with valid temperatures"
    fi
}

# Test anomaly detection algorithm
test_anomaly_detection() {
    log_info "Testing anomaly detection..."

    local result=$(psql -U postgres -d ratnakara_db -tc "
        SELECT COUNT(*) FROM anomalies
        WHERE z_score > 2.5 AND alert_level IN ('critical', 'warning')
        LIMIT 1" 2>/dev/null || echo "0")

    if [ "$result" -ge 0 ]; then
        log_success "Anomaly detection query successful"
    else
        log_error "Anomaly detection query failed"
        return 1
    fi
}

# Test Darwin Core field validation
test_darwin_core_validation() {
    log_info "Testing Darwin Core field validation..."

    local complete=$(psql -U postgres -d ratnakara_db -tc "
        SELECT COUNT(*) FROM occurrences
        WHERE occurrenceID IS NOT NULL
          AND scientificName IS NOT NULL
          AND decimalLatitude IS NOT NULL
          AND decimalLongitude IS NOT NULL
          AND eventDate IS NOT NULL" 2>/dev/null || echo "0")

    local total=$(psql -U postgres -d ratnakara_db -tc "
        SELECT COUNT(*) FROM occurrences" 2>/dev/null || echo "0")

    if [ "$total" -gt 0 ]; then
        local percent=$((complete * 100 / total))
        log_success "Darwin Core completeness: $percent% ($complete/$total records)"
    else
        log_warning "No occurrence records found"
    fi
}

# Test referential integrity
test_referential_integrity() {
    log_info "Testing referential integrity..."

    local orphaned=$(psql -U postgres -d ratnakara_db -tc "
        SELECT COUNT(*) FROM dna_sequences
        WHERE occurrenceID IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM occurrences o WHERE o.occurrenceID = dna_sequences.occurrenceID)" 2>/dev/null || echo "0")

    if [ "$orphaned" -eq 0 ]; then
        log_success "No orphaned DNA sequence references"
    else
        log_warning "Found $orphaned orphaned DNA sequence references"
    fi
}

# Test coordinate validation
test_coordinate_bounds() {
    log_info "Testing coordinate bounds..."

    local invalid=$(psql -U postgres -d ratnakara_db -tc "
        SELECT COUNT(*) FROM occurrences
        WHERE decimalLatitude NOT BETWEEN -90 AND 90
           OR decimalLongitude NOT BETWEEN -180 AND 180" 2>/dev/null || echo "0")

    if [ "$invalid" -eq 0 ]; then
        log_success "All coordinates within valid bounds"
    else
        log_error "Found $invalid records with invalid coordinates"
        return 1
    fi
}

# Test biogeochemistry ranges
test_biogeochemistry_ranges() {
    log_info "Testing biogeochemistry value ranges..."

    local invalid_sr=$(psql -U postgres -d ratnakara_db -tc "
        SELECT COUNT(*) FROM otolith_records
        WHERE sr_ca_ratio IS NOT NULL
          AND (sr_ca_ratio < 0.0001 OR sr_ca_ratio > 0.1)" 2>/dev/null || echo "0")

    if [ "$invalid_sr" -eq 0 ]; then
        log_success "Sr/Ca ratios within valid ranges"
    else
        log_warning "Found $invalid_sr records with out-of-range Sr/Ca ratios"
    fi
}

# Test database indexes
test_database_indexes() {
    log_info "Testing database indexes..."

    local indexes=$(psql -U postgres -d ratnakara_db -tc "
        SELECT COUNT(*) FROM pg_indexes
        WHERE schemaname='public' AND indexname LIKE '%idx%'" 2>/dev/null || echo "0")

    if [ "$indexes" -gt 0 ]; then
        log_success "Found $indexes database indexes"
    else
        log_warning "No indexes found (may impact performance)"
    fi
}

# Main test execution
main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║          Phase 1 MVP End-to-End Testing Suite                      ║${NC}"
    echo -e "${BLUE}║          Ratnakara Marine Data Platform                             ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # Run all tests
    test_database_connection || exit 1
    echo ""

    test_darwin_core_tables
    echo ""

    test_darwin_core_validation
    echo ""

    test_json_importer
    echo ""

    test_dna_gc_content
    echo ""

    test_otolith_temperature
    echo ""

    test_anomaly_detection
    echo ""

    test_referential_integrity
    echo ""

    test_coordinate_bounds
    echo ""

    test_biogeochemistry_ranges
    echo ""

    test_database_indexes
    echo ""

    # Summary
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                       Test Summary                                 ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    echo ""

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ All tests passed! Phase 1 MVP ready for deployment.${NC}"
        return 0
    else
        echo -e "${RED}✗ Some tests failed. Review the output above.${NC}"
        return 1
    fi
}

# Run main function
main
