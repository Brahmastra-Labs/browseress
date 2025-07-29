#!/bin/bash

# Comprehensive REST API Test for Browseress Todo App
# Tests all REST principles and edge cases

echo "========================================"
echo "Browseress Todo REST API Test Suite"
echo "========================================"
echo ""
echo "Make sure:"
echo "1. Relay server is running (node relay-server.js)"
echo "2. Browser has the todo app open and started"
echo "3. API is available at http://localhost:8080"
echo ""
echo "Press Enter to start tests..."
read

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test tracking
TESTS=0
PASSED=0
FAILED=0

# Base URL
BASE_URL="http://localhost:8080"

# Helper functions
run_test() {
    local test_name="$1"
    local method="$2"
    local url="$3"
    local expected_status="$4"
    local data="$5"
    local headers="$6"
    
    TESTS=$((TESTS + 1))
    echo -e "\n${YELLOW}Test $TESTS: $test_name${NC}"
    echo "Request: $method $url"
    if [ -n "$data" ]; then
        echo "Body: $data"
    fi
    
    # Build curl command
    local curl_cmd="curl -s -w '\n%{http_code}' -X $method"
    if [ -n "$headers" ]; then
        curl_cmd="$curl_cmd $headers"
    fi
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi
    curl_cmd="$curl_cmd '$url'"
    
    # Execute and capture response
    if [ "$method" = "HEAD" ]; then
        # HEAD requests need special handling (use -I flag and different parsing)
        local response=$(curl -s -I -w '%{http_code}' "$url")
        local status_code=$(echo "$response" | tail -n1)
        local body=""  # HEAD has no body
    else
        local response=$(eval $curl_cmd)
        local status_code=$(echo "$response" | tail -n1)
        local body=$(echo "$response" | sed '$d')
    fi
    
    echo "Response Status: $status_code"
    echo "Response Body: $body"
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC}"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAILED - Expected status $expected_status${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo -e "\n${YELLOW}=== SETUP ===${NC}"
echo "Clearing existing todos..."
# Use bulk delete endpoint
result=$(curl -s -X DELETE "$BASE_URL/todos")
deleted_count=$(echo "$result" | jq -r '.deleted // 0')
echo "Deleted $deleted_count existing todos"

echo -e "\n${YELLOW}=== 1. BASIC CRUD OPERATIONS ===${NC}"

# Test GET empty collection
run_test "GET empty todos collection" \
    "GET" "$BASE_URL/todos" "200"

# Test POST validation - missing title
run_test "POST with missing title (should fail)" \
    "POST" "$BASE_URL/todos" "400" \
    '{"completed":true}' \
    "-H 'Content-Type: application/json'"

# Test POST validation - empty title
run_test "POST with empty title (should fail)" \
    "POST" "$BASE_URL/todos" "400" \
    '{"title":"","completed":true}' \
    "-H 'Content-Type: application/json'"

# Test POST valid todo
run_test "POST valid todo" \
    "POST" "$BASE_URL/todos" "201" \
    '{"title":"Write tests","completed":false}' \
    "-H 'Content-Type: application/json'"

# Save the todo ID for later tests
TODO_ID=$(curl -s "$BASE_URL/todos" | jq -r '.[0].id')

# Test GET single todo
run_test "GET single todo" \
    "GET" "$BASE_URL/todos/$TODO_ID" "200"

# Test GET non-existent todo
run_test "GET non-existent todo" \
    "GET" "$BASE_URL/todos/999999" "404"

# Test GET invalid ID format
run_test "GET with invalid ID format" \
    "GET" "$BASE_URL/todos/abc" "400"

echo -e "\n${YELLOW}=== 2. UPDATE OPERATIONS (PUT vs PATCH) ===${NC}"

# Test PUT (full update)
run_test "PUT full update" \
    "PUT" "$BASE_URL/todos/$TODO_ID" "200" \
    '{"title":"Write comprehensive tests","completed":true}' \
    "-H 'Content-Type: application/json'"

# Test PUT with missing required field
run_test "PUT with missing title (should fail)" \
    "PUT" "$BASE_URL/todos/$TODO_ID" "400" \
    '{"completed":false}' \
    "-H 'Content-Type: application/json'"

# Test PATCH (partial update)
run_test "PATCH partial update - title only" \
    "PATCH" "$BASE_URL/todos/$TODO_ID" "200" \
    '{"title":"Write amazing tests"}' \
    "-H 'Content-Type: application/json'"

# Test PATCH - completed only
run_test "PATCH partial update - completed only" \
    "PATCH" "$BASE_URL/todos/$TODO_ID" "200" \
    '{"completed":false}' \
    "-H 'Content-Type: application/json'"

# Test PATCH with empty title
run_test "PATCH with empty title (should fail)" \
    "PATCH" "$BASE_URL/todos/$TODO_ID" "400" \
    '{"title":""}' \
    "-H 'Content-Type: application/json'"

echo -e "\n${YELLOW}=== 3. DELETE OPERATIONS ===${NC}"

# Create a todo to delete
curl -s -X POST "$BASE_URL/todos" \
    -H "Content-Type: application/json" \
    -d '{"title":"Todo to delete"}' > /dev/null
DELETE_ID=$(curl -s "$BASE_URL/todos" | jq -r '.[] | select(.title=="Todo to delete") | .id')

# Test DELETE existing todo
run_test "DELETE existing todo" \
    "DELETE" "$BASE_URL/todos/$DELETE_ID" "204"

# Test DELETE non-existent todo
run_test "DELETE non-existent todo" \
    "DELETE" "$BASE_URL/todos/$DELETE_ID" "404"

# Test DELETE invalid ID
run_test "DELETE with invalid ID" \
    "DELETE" "$BASE_URL/todos/xyz" "400"

echo -e "\n${YELLOW}=== 4. FILTERING & SEARCH ===${NC}"

# Add test data
echo "Adding test data..."
curl -s -X POST "$BASE_URL/todos" -H "Content-Type: application/json" -d '{"title":"Buy groceries","completed":false}' > /dev/null
curl -s -X POST "$BASE_URL/todos" -H "Content-Type: application/json" -d '{"title":"Buy milk","completed":true}' > /dev/null
curl -s -X POST "$BASE_URL/todos" -H "Content-Type: application/json" -d '{"title":"Read book","completed":true}' > /dev/null
curl -s -X POST "$BASE_URL/todos" -H "Content-Type: application/json" -d '{"title":"Write code","completed":false}' > /dev/null

# Test filtering by completed
run_test "Filter completed todos" \
    "GET" "$BASE_URL/todos?completed=true" "200"

run_test "Filter incomplete todos" \
    "GET" "$BASE_URL/todos?completed=false" "200"

# Test search
run_test "Search todos by title" \
    "GET" "$BASE_URL/todos?q=buy" "200"

# Test combined filters
run_test "Search + filter combined" \
    "GET" "$BASE_URL/todos?q=buy&completed=false" "200"

echo -e "\n${YELLOW}=== 5. PAGINATION ===${NC}"

# Add more todos for pagination
echo "Adding more todos for pagination test..."
for i in {1..15}; do
    curl -s -X POST "$BASE_URL/todos" \
        -H "Content-Type: application/json" \
        -d "{\"title\":\"Task $i\",\"completed\":false}" > /dev/null
done

# Test pagination
run_test "Get first page (default limit)" \
    "GET" "$BASE_URL/todos?page=1" "200"

run_test "Get second page" \
    "GET" "$BASE_URL/todos?page=2" "200"

run_test "Custom page size" \
    "GET" "$BASE_URL/todos?page=1&limit=5" "200"

# Check pagination headers
echo -e "\n${YELLOW}Checking pagination headers...${NC}"
headers=$(curl -s -I "$BASE_URL/todos?page=1&limit=5")
echo "$headers" | grep -E "X-Total-Count|X-Page|X-Limit"

echo -e "\n${YELLOW}=== 6. OPTIONS (CORS) ===${NC}"

# Test OPTIONS on collection
run_test "OPTIONS on /todos" \
    "OPTIONS" "$BASE_URL/todos" "204"

# Test OPTIONS on item
run_test "OPTIONS on /todos/:id" \
    "OPTIONS" "$BASE_URL/todos/1" "204"

echo -e "\n${YELLOW}=== 7. ERROR HANDLING ===${NC}"

# Test 404 on unknown route
run_test "Unknown route returns 404" \
    "GET" "$BASE_URL/unknown" "404"

# Test HEAD method (Express supports HEAD for all GET routes)
run_test "HEAD method on GET route" \
    "HEAD" "$BASE_URL/todos" "200"

echo -e "\n${YELLOW}=== 8. IDEMPOTENCY ===${NC}"

# Create a todo
IDEMPOTENT_RESPONSE=$(curl -s -X POST "$BASE_URL/todos" \
    -H "Content-Type: application/json" \
    -d '{"title":"Idempotency test","completed":false}')
IDEMPOTENT_ID=$(echo "$IDEMPOTENT_RESPONSE" | jq -r '.id')

# PUT same data multiple times (should be idempotent)
echo "Testing PUT idempotency..."
for i in {1..3}; do
    response=$(curl -s -X PUT "$BASE_URL/todos/$IDEMPOTENT_ID" \
        -H "Content-Type: application/json" \
        -d '{"title":"Idempotency test","completed":true}')
    echo "Attempt $i: $(echo $response | jq -c '{id,title,completed}')"
done

echo -e "\n${YELLOW}=== TEST SUMMARY ===${NC}"
echo "========================================"
echo "Total Tests: $TESTS"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo "========================================"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! 🎉${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed 😞${NC}"
    exit 1
fi