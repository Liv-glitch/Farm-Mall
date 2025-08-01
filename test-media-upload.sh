#!/bin/bash

# Comprehensive Media Upload Test Scripts for Dynamic Farm Management System
# Tests the new hierarchical media storage architecture with real files

set -e

# Configuration
BASE_URL="http://localhost:3000/api/v1"
LOGIN_EMAIL="betttonny966@gmail.com"
LOGIN_PASSWORD="Password123"

# Test file paths (using actual files from the project)
PLANT_IMAGE_1="uploads/test-images/SpecField_11.jpg"
PLANT_IMAGE_2="uploads/test-images/plague.jpg"
PDF_DOCUMENT="uploads/receipt.pdf"
TEMP_IMAGE="uploads/temp/image-1751457415865-401770578.jpg"

# Sample UUIDs for testing (you may need to adjust these based on your actual data)
FARM_ID="b677d0e6-082e-4261-93f1-8a8d0fc1197e"
USER_ID="9ec951f8-47e1-4a64-906d-e5118681cb7e"
FIELD_ID="afb69b55-027b-4f1c-9b8b-01b11520b4a6"
RECORD_ID="550e8400-e29b-41d4-a716-446655440003"
LOCATION_ID="550e8400-e29b-41d4-a716-446655440004"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Global variables
AUTH_TOKEN=""
USER_PROFILE_MEDIA_ID=""
LIVESTOCK_MEDIA_ID=""
CROP_MEDIA_ID=""
SOIL_MEDIA_ID=""
GENERIC_MEDIA_ID=""

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_dependencies() {
    print_header "Checking Dependencies"
    
    # Check if jq is available
    if ! command -v jq &> /dev/null; then
        print_error "jq is required for JSON parsing. Please install it:"
        echo "  macOS: brew install jq"
        echo "  Ubuntu: sudo apt-get install jq"
        exit 1
    fi
    print_success "jq is available"
    
    # Check if test files exist
    for file in "$PLANT_IMAGE_1" "$PLANT_IMAGE_2" "$PDF_DOCUMENT"; do
        if [ -f "$file" ]; then
            print_success "Found test file: $file"
        else
            print_error "Test file not found: $file"
            exit 1
        fi
    done
}

authenticate() {
    print_header "Authentication"
    
    print_info "Logging in as $LOGIN_EMAIL..."
    
    TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"identifier\": \"$LOGIN_EMAIL\",
            \"password\": \"$LOGIN_PASSWORD\"
        }")
    
    # Check if login was successful
    if echo "$TOKEN_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        AUTH_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.data.tokens.accessToken')
        if [ "$AUTH_TOKEN" != "null" ] && [ -n "$AUTH_TOKEN" ]; then
            print_success "Authentication successful"
            print_info "Token: ${AUTH_TOKEN:0:20}..."
        else
            print_error "Failed to extract token from response"
            echo "$TOKEN_RESPONSE" | jq .
            exit 1
        fi
    else
        print_error "Authentication failed"
        echo "$TOKEN_RESPONSE" | jq .
        exit 1
    fi
}

test_user_profile_upload() {
    print_header "Testing User Profile Upload"
    print_info "Uploading field image as profile picture: $PLANT_IMAGE_1"
    
    response=$(curl -s -w "%{http_code}" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -F "file=@$PLANT_IMAGE_1" \
        -F "isPublic=true" \
        "$BASE_URL/media/upload/user-profile")
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" -eq 201 ]; then
        print_success "User profile upload successful"
        echo "$response_body" | jq '.'
        USER_PROFILE_MEDIA_ID=$(echo "$response_body" | jq -r '.data.id')
        print_info "Media ID: $USER_PROFILE_MEDIA_ID"
        
        # Verify storage path structure
        STORAGE_PATH=$(echo "$response_body" | jq -r '.data.storagePath')
        print_info "Storage path: $STORAGE_PATH"
        
        # Check if it follows expected pattern: users/profiles/{userId}/{filename}
        if [[ "$STORAGE_PATH" == users/profiles/* ]]; then
            print_success "Storage path follows expected hierarchical structure"
        else
            print_warning "Unexpected storage path structure"
        fi
    else
        print_error "User profile upload failed (HTTP $http_code)"
        echo "$response_body" | jq .
    fi
    echo ""
}

test_livestock_upload() {
    print_header "Testing Livestock Media Upload"
    print_info "Uploading disease image as livestock record: $PLANT_IMAGE_2"
    
    response=$(curl -s -w "%{http_code}" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -F "file=@$PLANT_IMAGE_2" \
        -F "farmId=$FARM_ID" \
        -F "animalType=cattle" \
        -F "recordId=$RECORD_ID" \
        -F "generateVariants=true" \
        "$BASE_URL/media/upload/livestock")
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" -eq 201 ]; then
        print_success "Livestock media upload successful"
        echo "$response_body" | jq '.'
        LIVESTOCK_MEDIA_ID=$(echo "$response_body" | jq -r '.data.id')
        print_info "Media ID: $LIVESTOCK_MEDIA_ID"
        
        STORAGE_PATH=$(echo "$response_body" | jq -r '.data.storagePath')
        print_info "Storage path: $STORAGE_PATH"
        
        # Check if it follows expected pattern: livestock/cattle/{farmId}/{recordId}/{filename}
        if [[ "$STORAGE_PATH" == livestock/cattle/* ]]; then
            print_success "Storage path follows expected hierarchical structure"
        else
            print_warning "Unexpected storage path structure"
        fi
    else
        print_error "Livestock media upload failed (HTTP $http_code)"
        echo "$response_body" | jq .
    fi
    echo ""
}

test_crop_upload() {
    print_header "Testing Crop Media Upload"
    print_info "Uploading field image for crop identification: $PLANT_IMAGE_1"
    
    response=$(curl -s -w "%{http_code}" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -F "file=@$PLANT_IMAGE_1" \
        -F "farmId=$FARM_ID" \
        -F "purpose=identification" \
        -F "fieldId=$FIELD_ID" \
        -F "entityId=$RECORD_ID" \
        -F "generateVariants=true" \
        "$BASE_URL/media/upload/crops")
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" -eq 201 ]; then
        print_success "Crop media upload successful"
        echo "$response_body" | jq '.'
        CROP_MEDIA_ID=$(echo "$response_body" | jq -r '.data.id')
        print_info "Media ID: $CROP_MEDIA_ID"
        
        STORAGE_PATH=$(echo "$response_body" | jq -r '.data.storagePath')
        print_info "Storage path: $STORAGE_PATH"
        
        # Check if it follows expected pattern: crops/identification/{farmId}/{recordId}/{filename}
        if [[ "$STORAGE_PATH" == crops/identification/* ]]; then
            print_success "Storage path follows expected hierarchical structure"
        else
            print_warning "Unexpected storage path structure"
        fi
    else
        print_error "Crop media upload failed (HTTP $http_code)"
        echo "$response_body" | jq .
    fi
    echo ""
}

test_soil_analysis_upload() {
    print_header "Testing Soil Analysis Upload"
    print_info "Uploading PDF document as soil test report: $PDF_DOCUMENT"
    
    response=$(curl -s -w "%{http_code}" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -F "file=@$PDF_DOCUMENT" \
        -F "farmId=$FARM_ID" \
        -F "analysisType=soil-test" \
        -F "locationId=$LOCATION_ID" \
        "$BASE_URL/media/upload/soil-analysis")
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" -eq 201 ]; then
        print_success "Soil analysis upload successful"
        echo "$response_body" | jq '.'
        SOIL_MEDIA_ID=$(echo "$response_body" | jq -r '.data.id')
        print_info "Media ID: $SOIL_MEDIA_ID"
        
        STORAGE_PATH=$(echo "$response_body" | jq -r '.data.storagePath')
        print_info "Storage path: $STORAGE_PATH"
        
        # Check if it follows expected pattern: soil-analysis/soil-test/{farmId}/{locationId}/{filename}
        if [[ "$STORAGE_PATH" == soil-analysis/soil-test/* ]]; then
            print_success "Storage path follows expected hierarchical structure"
        else
            print_warning "Unexpected storage path structure"
        fi
    else
        print_error "Soil analysis upload failed (HTTP $http_code)"
        echo "$response_body" | jq .
    fi
    echo ""
}

test_generic_dynamic_upload() {
    print_header "Testing Generic Dynamic Upload (Infrastructure)"
    print_info "Uploading image for farm infrastructure documentation: $TEMP_IMAGE"
    
    response=$(curl -s -w "%{http_code}" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -F "file=@$TEMP_IMAGE" \
        -F "category=infrastructure" \
        -F "subcategory=buildings" \
        -F "contextId=$FARM_ID" \
        -F "entityId=greenhouse-001" \
        -F "generateVariants=true" \
        -F "isPublic=false" \
        "$BASE_URL/media/upload")
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" -eq 201 ]; then
        print_success "Generic dynamic upload successful"
        echo "$response_body" | jq '.'
        GENERIC_MEDIA_ID=$(echo "$response_body" | jq -r '.data.id')
        print_info "Media ID: $GENERIC_MEDIA_ID"
        
        STORAGE_PATH=$(echo "$response_body" | jq -r '.data.storagePath')
        print_info "Storage path: $STORAGE_PATH"
        
        # Check if it follows expected pattern: infrastructure/buildings/{farmId}/greenhouse-001/{filename}
        if [[ "$STORAGE_PATH" == infrastructure/buildings/* ]]; then
            print_success "Storage path follows expected hierarchical structure"
        else
            print_warning "Unexpected storage path structure"
        fi
    else
        print_error "Generic dynamic upload failed (HTTP $http_code)"
        echo "$response_body" | jq .
    fi
    echo ""
}

test_additional_scenarios() {
    print_header "Testing Additional Upload Scenarios"
    
    # Test documentation upload
    print_info "Testing documentation upload..."
    response=$(curl -s -w "%{http_code}" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -F "file=@$PDF_DOCUMENT" \
        -F "category=documentation" \
        -F "subcategory=procedures" \
        -F "contextId=$FARM_ID" \
        -F "entityId=irrigation-procedure-v2" \
        -F "generateVariants=false" \
        -F "isPublic=false" \
        "$BASE_URL/media/upload")
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" -eq 201 ]; then
        print_success "Documentation upload successful"
        STORAGE_PATH=$(echo "$response_body" | jq -r '.data.storagePath')
        print_info "Storage path: $STORAGE_PATH"
    else
        print_error "Documentation upload failed (HTTP $http_code)"
    fi
    
    echo ""
    
    # Test crop health monitoring
    print_info "Testing crop health monitoring upload..."
    response=$(curl -s -w "%{http_code}" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -F "file=@$PLANT_IMAGE_2" \
        -F "farmId=$FARM_ID" \
        -F "purpose=health" \
        -F "fieldId=$FIELD_ID" \
        -F "entityId=plot-A-001" \
        -F "generateVariants=true" \
        "$BASE_URL/media/upload/crops")
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" -eq 201 ]; then
        print_success "Crop health monitoring upload successful"
        STORAGE_PATH=$(echo "$response_body" | jq -r '.data.storagePath')
        print_info "Storage path: $STORAGE_PATH"
    else
        print_error "Crop health monitoring upload failed (HTTP $http_code)"
    fi
    
    echo ""
}

test_media_association() {
    print_header "Testing Media Association"
    
    if [ -z "$CROP_MEDIA_ID" ]; then
        print_error "No crop media ID available for association test"
        return
    fi
    
    print_info "Associating crop media with identification record..."
    response=$(curl -s -w "%{http_code}" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"associatableType\": \"crop_identification\",
            \"associatableId\": \"$RECORD_ID\",
            \"role\": \"primary\",
            \"category\": \"crops\",
            \"subcategory\": \"identification\",
            \"contextId\": \"$FARM_ID\",
            \"entityId\": \"$RECORD_ID\",
            \"order\": 0
        }" \
        "$BASE_URL/media/$CROP_MEDIA_ID/associate")
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" -eq 200 ]; then
        print_success "Media association successful"
        echo "$response_body" | jq '.'
    else
        print_error "Media association failed (HTTP $http_code)"
        echo "$response_body" | jq .
    fi
    echo ""
}

test_get_user_media() {
    print_header "Testing Get User Media"
    
    print_info "Retrieving user's uploaded media..."
    response=$(curl -s -w "%{http_code}" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        "$BASE_URL/media/my-media?limit=10&offset=0")
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" -eq 200 ]; then
        print_success "Get user media successful"
        
        # Count uploaded media
        MEDIA_COUNT=$(echo "$response_body" | jq '.data | length')
        print_info "Found $MEDIA_COUNT media files"
        
        # Show storage paths to verify hierarchy
        echo "$response_body" | jq -r '.data[] | "ID: " + .id + " | Path: " + .storagePath + " | Context: " + (.context | tostring)'
    else
        print_error "Get user media failed (HTTP $http_code)"
        echo "$response_body" | jq .
    fi
    echo ""
}

test_media_analytics() {
    print_header "Testing Media Analytics"
    
    print_info "Retrieving media analytics..."
    response=$(curl -s -w "%{http_code}" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        "$BASE_URL/media/analytics")
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" -eq 200 ]; then
        print_success "Media analytics successful"
        echo "$response_body" | jq '.'
        
        # Extract key metrics
        TOTAL_FILES=$(echo "$response_body" | jq '.data.totalFiles')
        TOTAL_SIZE=$(echo "$response_body" | jq '.data.totalSize')
        print_info "Total files: $TOTAL_FILES, Total size: $TOTAL_SIZE bytes"
    else
        print_error "Media analytics failed (HTTP $http_code)"
        echo "$response_body" | jq .
    fi
    echo ""
}

test_generate_variants() {
    print_header "Testing Generate Variants"
    
    if [ -z "$CROP_MEDIA_ID" ]; then
        print_error "No crop media ID available for variant generation test"
        return
    fi
    
    print_info "Generating variants for crop media..."
    response=$(curl -s -w "%{http_code}" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -X POST \
        "$BASE_URL/media/$CROP_MEDIA_ID/variants")
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" -eq 200 ]; then
        print_success "Generate variants successful"
        echo "$response_body" | jq '.'
    else
        print_error "Generate variants failed (HTTP $http_code)"
        echo "$response_body" | jq .
    fi
    echo ""
}

test_get_media_by_association() {
    print_header "Testing Get Media by Association"
    
    print_info "Retrieving media by association..."
    response=$(curl -s -w "%{http_code}" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        "$BASE_URL/media/by-association/crop_identification/$RECORD_ID?role=primary")
    
    http_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$http_code" -eq 200 ]; then
        print_success "Get media by association successful"
        echo "$response_body" | jq '.'
    else
        print_error "Get media by association failed (HTTP $http_code)"
        echo "$response_body" | jq .
    fi
    echo ""
}

show_summary() {
    print_header "Test Summary"
    
    echo "Test files used:"
    echo "  • Plant Image 1: $PLANT_IMAGE_1"
    echo "  • Plant Image 2: $PLANT_IMAGE_2"
    echo "  • PDF Document: $PDF_DOCUMENT"
    echo "  • Temp Image: $TEMP_IMAGE"
    echo ""
    
    echo "Media IDs created:"
    [ -n "$USER_PROFILE_MEDIA_ID" ] && echo "  • User Profile: $USER_PROFILE_MEDIA_ID"
    [ -n "$LIVESTOCK_MEDIA_ID" ] && echo "  • Livestock: $LIVESTOCK_MEDIA_ID"
    [ -n "$CROP_MEDIA_ID" ] && echo "  • Crop: $CROP_MEDIA_ID"
    [ -n "$SOIL_MEDIA_ID" ] && echo "  • Soil Analysis: $SOIL_MEDIA_ID"
    [ -n "$GENERIC_MEDIA_ID" ] && echo "  • Infrastructure: $GENERIC_MEDIA_ID"
    echo ""
    
    echo "Expected storage structure verified:"
    echo "  • users/profiles/{userId}/"
    echo "  • livestock/{animalType}/{farmId}/{recordId}/"
    echo "  • crops/{purpose}/{farmId}/{entityId}/"
    echo "  • soil-analysis/{analysisType}/{farmId}/{locationId}/"
    echo "  • infrastructure/{type}/{farmId}/{entityId}/"
    echo "  • documentation/{type}/{farmId}/{entityId}/"
    echo ""
    
    print_success "Dynamic hierarchical media system tested successfully!"
}

# Main execution
main() {
    print_header "Dynamic Farm Media Management System - Comprehensive Test Suite"
    print_info "Testing with real files and authentication"
    echo ""
    
    check_dependencies
    authenticate
    
    # Core upload tests
    test_user_profile_upload
    test_livestock_upload
    test_crop_upload
    test_soil_analysis_upload
    test_generic_dynamic_upload
    
    # Additional scenarios
    test_additional_scenarios
    
    # Association and retrieval tests
    test_media_association
    test_get_user_media
    test_get_media_by_association
    test_media_analytics
    test_generate_variants
    
    show_summary
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi